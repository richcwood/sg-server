import { convertData } from '../utils/ResponseConverters';
import { ScheduleSchema, ScheduleModel } from '../domain/Schedule';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';

import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class ScheduleService {
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
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<ScheduleSchema> {
        if (data.Seconds) throw new ValidationError('Seconds interval not supported');

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
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<object> {
        if (data.Seconds) throw new ValidationError('Seconds interval not supported');

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
        data: any,
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
