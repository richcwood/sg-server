import { ScheduleSchema, ScheduleModel } from '../domain/Schedule';

import { MissingObjectError, ValidationError } from '../utils/Errors';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { convertData } from '../utils/ResponseConverters';
import { Subset } from '../utils/Types';

import { SGUtils } from '../../shared/SGUtils';

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
        if (schedule && 'cron' in schedule && schedule.cron.Repetition) {
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
                console.log('creating repetition schedule');
                const startDate = new Date(dateScheduled.getTime() + intervalMinutes * 60000).toISOString();
                const endDate = new Date(dateScheduled.getTime() + durationMinutes * 60000).toISOString();
                const interval = {
                    Weeks: repetition.interval.Weeks,
                    Days: repetition.interval.Days,
                    Hours: repetition.interval.Hours,
                    Minutes: repetition.interval.Minutes,
                    Start_Date: startDate,
                    End_Date: endDate,
                    Jitter: undefined,
                };
                const newSchedule: Partial<ScheduleSchema> = {
                    _jobDefId: schedule._jobDefId,
                    name: scheduleName,
                    interval: interval,
                    FunctionKwargs: schedule.FunctionKwargs,
                    TriggerType: schedule.TriggerType,
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
