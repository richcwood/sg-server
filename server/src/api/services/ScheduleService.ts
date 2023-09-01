import { ScheduleSchema, ScheduleModel } from '../domain/Schedule';

import { MissingObjectError, ValidationError } from '../utils/Errors';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { convertData } from '../utils/ResponseConverters';
import { Subset } from '../utils/Types';

import { SGUtils } from '../../shared/SGUtils';
import { WindowsTaskParser } from '../../shared/WindowsTaskParser';

import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class ScheduleService {
    public async createScheduleFromRepetition(
        _teamId: mongodb.ObjectId,
        _scheduleId: mongodb.ObjectId,
        dateScheduled: Date,
        correlationId: string
    ): Promise<ScheduleSchema | null> {
        const schedule: ScheduleSchema = await this.findSchedule(_teamId, _scheduleId);
        if (
            schedule &&
            schedule.TriggerType == 'cron' &&
            schedule.cron.Repetition &&
            schedule.cron.Repetition.enabled
        ) {
            const repetition = schedule.cron.Repetition;
            const scheduleName = `${schedule.name} - repetition`;
            const intervalMinutes: number = SGUtils.totalMinutes(
                repetition.interval.Weeks,
                repetition.interval.Days,
                repetition.interval.Hours,
                repetition.interval.Minutes
            );
            const durationMinutes: number = SGUtils.totalMinutes(
                repetition.duration.Weeks,
                repetition.duration.Days,
                repetition.duration.Hours,
                repetition.duration.Minutes
            );
            if (durationMinutes >= intervalMinutes) {
                const startDate = new Date(dateScheduled.getTime() + intervalMinutes * 60000).toJSON();
                const endDate = new Date(dateScheduled.getTime() + durationMinutes * 60000).toJSON();
                const interval = {
                    Weeks: repetition.interval.Weeks,
                    Days: repetition.interval.Days,
                    Hours: repetition.interval.Hours,
                    Minutes: repetition.interval.Minutes,
                    Start_Date: startDate,
                    End_Date: endDate,
                    Jitter: undefined,
                };
                const cron = {
                    Repetition: {
                        enabled: false,
                        interval: {},
                        duration: {},
                    },
                };
                const newSchedule: Subset<ScheduleSchema> = {
                    _jobDefId: schedule._jobDefId,
                    name: scheduleName,
                    isActive: true,
                    interval: interval,
                    cron: cron,
                    FunctionKwargs: schedule.FunctionKwargs,
                    TriggerType: 'interval',
                    createdBy: schedule.createdBy,
                    lastUpdatedBy: schedule.lastUpdatedBy,
                    misfire_grace_time: schedule.misfire_grace_time,
                    coalesce: schedule.coalesce,
                    max_instances: schedule.max_instances,
                };
                return this.createSchedule(_teamId, newSchedule, correlationId);
            }
        }
        return;
    }

    public async createSchedulesFromWindowsTask(
        _teamId: mongodb.ObjectId,
        _jobDefId: mongodb.ObjectId,
        data: any,
        index: number,
        timezone: string,
        correlationId: string
    ): Promise<ScheduleSchema[] | null> {
        const task = data['Task'];
        let newSchedules: ScheduleSchema[] = [];
        let triggerIndex = 0;

        let createScheduleData = function (partialSchedule) {
            triggerIndex += 1;
            const defaults = {
                _teamId,
                _jobDefId: _jobDefId,
                name: `Schedule from Windows Task - ${index.toString()}.${triggerIndex}`,
                createdBy: data.createdBy,
                lastUpdatedBy: data.createdBy,
                FunctionKwargs: {
                    _teamId,
                    targetId: _jobDefId,
                    runtimeVars: {},
                },
            };

            return { ...defaults, ...partialSchedule };
        };

        if (task) {
            const windowsTaskParser = new WindowsTaskParser();
            let taskEnabled = false;
            if ('Enabled' in task['Settings']) taskEnabled = task['Settings']['Enabled'];
            if ('Triggers' in task) {
                for (let triggerType of Object.keys(task['Triggers'])) {
                    let triggers;
                    if (_.isArray(task['Triggers'][triggerType])) triggers = task['Triggers'][triggerType];
                    else triggers = [task['Triggers'][triggerType]];
                    for (let trigger of triggers) {
                        let partialSchedules: Subset<ScheduleSchema>[];
                        if (triggerType == 'CalendarTrigger') {
                            partialSchedules = windowsTaskParser.parseCalendarTrigger(trigger);
                            for (let partialSchedule of partialSchedules) {
                                partialSchedule.isActive = taskEnabled;
                                if ('Enabled' in trigger) partialSchedule.isActive = taskEnabled && trigger['Enabled'];
                                if (timezone && partialSchedule.cron) partialSchedule.cron.Timezone = timezone;
                                const newScheduleData = createScheduleData(partialSchedule);
                                const newSchedule = await scheduleService.createSchedule(
                                    _teamId,
                                    newScheduleData,
                                    correlationId,
                                    '_id'
                                );
                                newSchedules.push(newSchedule);
                            }
                        }
                    }
                }
            }
        }

        return newSchedules;
    }

    // Some services might need to add additional restrictions to bulk queries
    // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
    // public async updateBulkQuery(query): Promise<object> {
    //   // modify query here
    //   return query;
    // }

    public async findAllSchedulesInternal(filter?: any, responseFields?: string) {
        return ScheduleModel.find(filter).select(responseFields);
    }

    public async findAllSchedules(_teamId: mongodb.ObjectId, responseFields?: string) {
        return ScheduleModel.find({ _teamId }).select(responseFields);
    }

    public async findSchedule(
        _teamId: mongodb.ObjectId,
        scheduleId: mongodb.ObjectId,
        responseFields?: string
    ): Promise<ScheduleSchema | null> {
        const result: ScheduleSchema[] = await ScheduleModel.findById(scheduleId)
            .find({ _teamId })
            .select(responseFields);
        if (_.isArray(result) && result.length > 0) return result[0];
        return null;
    }

    public async createScheduleInternal(data: any): Promise<object> {
        const model = new ScheduleModel(data);
        await model.save();
        return { success: true };
    }

    public async createSchedule(
        _teamId: mongodb.ObjectId,
        data: Subset<ScheduleSchema>,
        correlationId: string,
        responseFields?: string
    ): Promise<ScheduleSchema> {
        data._teamId = _teamId;
        const scheduleModel = new ScheduleModel(data);
        const newSchedule = await scheduleModel.save();

        await rabbitMQPublisher.publish(
            _teamId,
            'Schedule',
            correlationId,
            PayloadOperation.CREATE,
            convertData(ScheduleSchema, newSchedule)
        );

        await rabbitMQPublisher.publishScheduleUpdate(
            Object.assign(convertData(ScheduleSchema, newSchedule), { Action: 'UpdateJob' })
        );

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findSchedule(_teamId, newSchedule._id, responseFields);
        } else {
            return newSchedule; // fully populated model
        }
    }

    public async updateSchedule(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: Subset<ScheduleSchema>,
        correlationId: string,
        responseFields?: string
    ): Promise<object> {
        const filter = { _id: id, _teamId };
        data.scheduleError = '';

        /// Delete _jobDefId and FunctionKwargs from data - can't modify those properties for an existing schedule
        delete data._jobDefId;

        const updatedSchedule = await ScheduleModel.findOneAndUpdate(filter, data, { new: true }).select(
            responseFields
        );

        if (!updatedSchedule)
            throw new MissingObjectError(
                `Schedule '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(
            _teamId,
            'Schedule',
            correlationId,
            PayloadOperation.UPDATE,
            convertData(ScheduleSchema, deltas)
        );

        await rabbitMQPublisher.publishScheduleUpdate(
            Object.assign(convertData(ScheduleSchema, updatedSchedule), { _teamId, Action: 'UpdateJob' })
        );

        return updatedSchedule; // fully populated model
    }

    public async updateFromScheduler(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: Subset<ScheduleSchema>,
        correlationId: string,
        responseFields?: string
    ): Promise<object> {
        const filter = { _id: id, _teamId };
        const updatedSchedule = await ScheduleModel.findOneAndUpdate(filter, data, { new: true }).select(
            responseFields
        );

        if (!updatedSchedule)
            throw new MissingObjectError(
                `Schedule '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(
            _teamId,
            'Schedule',
            correlationId,
            PayloadOperation.UPDATE,
            convertData(ScheduleSchema, deltas)
        );

        return updatedSchedule; // fully populated model
    }

    public async deleteSchedule(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        correlationId: string
    ): Promise<object> {
        const deleted = await ScheduleModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, 'Schedule', correlationId, PayloadOperation.DELETE, { id: id });

        await rabbitMQPublisher.publishScheduleUpdate({ id: id, Action: 'RemoveJob' });

        return deleted;
    }
}

export const scheduleService = new ScheduleService();
