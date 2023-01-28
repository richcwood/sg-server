import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { StepSchema, StepModel } from '../domain/Step';
import { defaultBulkGet } from '../utils/BulkGet';
import { stepService } from '../services/StepService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class StepController {
    public async getManySteps(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, StepSchema, StepModel, stepService);
    }

    // public async getStepsForTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
    //   const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    //   const _taskId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.taskId);
    //   const response: ResponseWrapper = (resp as any).body;

    //   const steps = await stepService.findAllTaskSteps(_teamId, _taskId, (<string>req.query.responseFields));

    //   if (_.isArray(steps) && steps.length === 0) {
    //     return next(new MissingObjectError(`No step found for task ${_taskId}.`));
    //   }
    //   else {
    //     response.data = convertResponseData(StepSchema, steps);
    //     return next();
    //   }
    // }

    public async getStep(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const step = await stepService.findStep(
                _teamId,
                new mongodb.ObjectId(req.params.stepId),
                <string>req.query.responseFields
            );

            if (_.isArray(step) && step.length === 0) {
                return next(new MissingObjectError(`Step ${req.params.stepId} not found.`));
            } else {
                response.data = convertResponseData(StepSchema, step[0]);
                return next();
            }
        } catch (err) {
            // If req.params.stepId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Step ${req.params.stepId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async deleteStep(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._jobId);
            response.data = await stepService.deleteStep(_teamId, _jobId, req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async createStep(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newStep = await stepService.createStep(
                _teamId,
                convertRequestData(StepSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(StepSchema, newStep);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateStep(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedStep: any = await stepService.updateStep(
                _teamId,
                new mongodb.ObjectId(req.params.stepId),
                convertRequestData(StepSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedStep) && updatedStep.length === 0) {
                return next(new MissingObjectError(`Step ${req.params.stepId} not found.`));
            } else {
                response.data = convertResponseData(StepSchema, updatedStep);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
}

export const stepController = new StepController();
