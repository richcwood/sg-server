import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { TaskOutcomeSchema, TaskOutcomeModel } from '../domain/TaskOutcome';
import { defaultBulkGet } from '../utils/BulkGet';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { BaseLogger } from '../../shared/KikiLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class TaskOutcomeController {

  public async getManyTaskOutcomes(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    defaultBulkGet({ _orgId }, req, resp, next, TaskOutcomeSchema, TaskOutcomeModel, taskOutcomeService);
  }


  public async getTaskOutcomesForJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobId);
    const response: ResponseWrapper = (resp as any).body;

    const steps = await taskOutcomeService.findTaskOutcomes(_orgId, { _jobId }, req.query.responseFields);

    if (_.isArray(steps) && steps.length === 0) {
      next(new MissingObjectError(`No task outcomes found for job ${_jobId}.`));
    }
    else {
      response.data = convertResponseData(TaskOutcomeSchema, steps);
      next();
    }
  }


  public async getTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
      const response: ResponseWrapper = (resp as any).body;
      const taskOutcome = await taskOutcomeService.findTaskOutcome(_orgId, new mongodb.ObjectId(req.params.taskOutcomeId), req.query.responseFields);

      if (_.isArray(taskOutcome) && taskOutcome.length === 0) {
        next(new MissingObjectError(`TaskOutcome ${req.params.taskOutcomeId} not found.`));
      }
      else {
        response.data = convertResponseData(TaskOutcomeSchema, taskOutcome[0]);
        next();
      }
    }
    catch (err) {
      // If req.params.taskOutcomeId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`TaskOutcome ${req.params.taskOutcomeId} not found.`));
      }
      else {
        next(err);
      }
    }
  }


  public async createTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const logger: BaseLogger = (<any>req).logger;
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newTaskOutcome = await taskOutcomeService.createTaskOutcome(_orgId, convertRequestData(TaskOutcomeSchema, req.body), logger, req.header('correlationId'), req.query.responseFields);
      response.data = convertResponseData(TaskOutcomeSchema, newTaskOutcome);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async updateTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const logger: BaseLogger = (<any>req).logger;
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedTaskOutcome: any = await taskOutcomeService.updateTaskOutcome(_orgId, new mongodb.ObjectId(req.params.taskOutcomeId), convertRequestData(TaskOutcomeSchema, req.body), logger, null, req.header('correlationId'), req.query.responseFields);

      if (_.isArray(updatedTaskOutcome) && updatedTaskOutcome.length === 0) {
        next(new MissingObjectError(`TaskOutcome ${req.params.taskOutcomeId} not found.`));
      }
      else {
        response.data = convertResponseData(TaskOutcomeSchema, updatedTaskOutcome);
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }
}

export const taskOutcomeController = new TaskOutcomeController();