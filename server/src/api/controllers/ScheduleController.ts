import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { ScheduleSchema, ScheduleModel } from '../domain/Schedule';
import { defaultBulkGet } from '../utils/BulkGet';
import { scheduleService } from '../services/ScheduleService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class ScheduleController {

    public async getManySchedules(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        defaultBulkGet({ _orgId }, req, resp, next, ScheduleSchema, ScheduleModel, scheduleService);
    }


    public async getSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = (resp as any).body;
            const schedule = await scheduleService.findSchedule(_orgId, new mongodb.ObjectId(req.params.scheduleId), req.query.responseFields);

            if (_.isArray(schedule) && schedule.length === 0) {
                next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            }
            else {
                response.data = convertResponseData(ScheduleSchema, schedule[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.scheduleId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        req.body.lastUpdatedBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newSchedule = await scheduleService.createSchedule(_orgId, convertRequestData(ScheduleSchema, req.body), req.header('correlationId'), req.query.responseFields);
            response.data = convertResponseData(ScheduleSchema, newSchedule);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        req.body.lastUpdatedBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedSchedule: any = await scheduleService.updateSchedule(_orgId, new mongodb.ObjectId(req.params.scheduleId), convertRequestData(ScheduleSchema, req.body), req.header('correlationId'), req.query.responseFields);

            if (_.isArray(updatedSchedule) && updatedSchedule.length === 0) {
                next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            }
            else {
                response.data = convertResponseData(ScheduleSchema, updatedSchedule);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async updateFromScheduler(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        req.body.lastUpdatedBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedSchedule: any = await scheduleService.updateFromScheduler(_orgId, new mongodb.ObjectId(req.params.scheduleId), convertRequestData(ScheduleSchema, req.body), req.header('correlationId'), req.query.responseFields);

            if (_.isArray(updatedSchedule) && updatedSchedule.length === 0) {
                next(new MissingObjectError(`Schedule ${req.params.scheduleId} not found.`));
            }
            else {
                response.data = convertResponseData(ScheduleSchema, updatedSchedule);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async deleteSchedule(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await scheduleService.deleteSchedule(_orgId, new mongodb.ObjectId(req.params.scheduleId), req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const scheduleController = new ScheduleController();