import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { TaskOutcomeSchema, TaskOutcomeModel } from '../domain/TaskOutcome';
import { defaultBulkGet } from '../utils/BulkGet';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { BaseLogger } from '../../shared/SGLogger';
import { AMQPConnector } from '../../shared/AMQPLib';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as config from 'config';

export class TaskOutcomeController {
    public async getManyTaskOutcomes(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, TaskOutcomeSchema, TaskOutcomeModel, taskOutcomeService);
    }

    public async getTaskOutcomesForJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobId);
        const response: ResponseWrapper = (resp as any).body;

        const steps = await taskOutcomeService.findTaskOutcomes(_teamId, { _jobId }, <string>req.query.responseFields);

        if (_.isArray(steps) && steps.length === 0) {
            return next(new MissingObjectError(`No task outcomes found for job ${_jobId}.`));
        } else {
            response.data = convertResponseData(TaskOutcomeSchema, steps);
            return next();
        }
    }

    public async getTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const taskOutcome = await taskOutcomeService.findTaskOutcome(
                _teamId,
                new mongodb.ObjectId(req.params.taskOutcomeId),
                <string>req.query.responseFields
            );

            if (!taskOutcome) {
                return next(new MissingObjectError(`TaskOutcome ${req.params.taskOutcomeId} not found.`));
            } else {
                response.data = convertResponseData(TaskOutcomeSchema, taskOutcome);
                return next();
            }
        } catch (err) {
            // If req.params.taskOutcomeId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                if (req.params && req.params.taskOutcomeId)
                    return next(new MissingObjectError(`TaskOutcome ${req.params.taskOutcomeId} not found.`));
                else return next(new MissingObjectError(`TaskOutcome not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async deleteTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._jobId);
            response.data = await taskOutcomeService.deleteTaskOutcome(_teamId, _jobId, req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async createTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        let _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        if (
            _teamId.toHexString() == process.env.sgAdminTeam &&
            req.body._teamId &&
            req.body._teamId != _teamId.toHexString()
        )
            _teamId = new mongodb.ObjectId(req.body._teamId);
        const response: ResponseWrapper = resp['body'];
        try {
            const newTaskOutcome = await taskOutcomeService.createTaskOutcome(
                _teamId,
                convertRequestData(TaskOutcomeSchema, req.body),
                logger,
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(TaskOutcomeSchema, newTaskOutcome);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        let _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        if (
            _teamId.toHexString() == process.env.sgAdminTeam &&
            req.body._teamId &&
            req.body._teamId != _teamId.toHexString()
        )
            _teamId = new mongodb.ObjectId(req.body._teamId);
        const response: ResponseWrapper = resp['body'];
        try {
            // console.log('task outcome -> ', convertRequestData(TaskOutcomeSchema, req.body));
            const updatedTaskOutcome: any = await taskOutcomeService.updateTaskOutcome(
                _teamId,
                new mongodb.ObjectId(req.params.taskOutcomeId),
                convertRequestData(TaskOutcomeSchema, req.body),
                logger,
                amqp,
                null,
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedTaskOutcome) && updatedTaskOutcome.length === 0) {
                return next(new MissingObjectError(`TaskOutcome ${req.params.taskOutcomeId} not found.`));
            } else {
                response.data = convertResponseData(TaskOutcomeSchema, updatedTaskOutcome);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
}

export const taskOutcomeController = new TaskOutcomeController();
