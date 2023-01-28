import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { ScheduleSchema, ScheduleModel } from '../domain/Schedule';
import { defaultBulkGet } from '../utils/BulkGet';
import { scheduleService } from '../services/ScheduleService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { FreeTierChecks } from '../../shared/FreeTierChecks';

export class ScheduleController {
    public async getManySchedules(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, ScheduleSchema, ScheduleModel, scheduleService);
    }

    public async getSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const schedule: ScheduleSchema = await scheduleService.findSchedule(
                _teamId,
                new mongodb.ObjectId(req.params.scheduleId),
                <string>req.query.responseFields
            );

            if (!schedule) {
                return next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            } else {
                response.data = convertResponseData(ScheduleSchema, schedule);
                return next();
            }
        } catch (err) {
            // If req.params.scheduleId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        req.body.lastUpdatedBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            await FreeTierChecks.PaidTierRequired(_teamId, 'Please upgrade to the paid tier to schedule Jobs');

            const newSchedule = await scheduleService.createSchedule(
                _teamId,
                convertRequestData(ScheduleSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(ScheduleSchema, newSchedule);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body.lastUpdatedBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedSchedule: any = await scheduleService.updateSchedule(
                _teamId,
                new mongodb.ObjectId(req.params.scheduleId),
                convertRequestData(ScheduleSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedSchedule) && updatedSchedule.length === 0) {
                return next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            } else {
                response.data = convertResponseData(ScheduleSchema, updatedSchedule);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async updateFromScheduler(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body.lastUpdatedBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedSchedule: any = await scheduleService.updateFromScheduler(
                _teamId,
                new mongodb.ObjectId(req.params.scheduleId),
                convertRequestData(ScheduleSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedSchedule) && updatedSchedule.length === 0) {
                return next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            } else {
                response.data = convertResponseData(ScheduleSchema, updatedSchedule);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await scheduleService.deleteSchedule(
                _teamId,
                new mongodb.ObjectId(req.params.scheduleId),
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const scheduleController = new ScheduleController();
