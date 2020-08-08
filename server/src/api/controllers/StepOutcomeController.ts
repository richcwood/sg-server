import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { StepOutcomeSchema, StepOutcomeModel } from '../domain/StepOutcome';
import { defaultBulkGet } from '../utils/BulkGet';
import { stepOutcomeService } from '../services/StepOutcomeService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { BaseLogger } from '../../shared/KikiLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class StepOutcomeController {

  public async getManyStepOutcomes(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    defaultBulkGet({ _orgId }, req, resp, next, StepOutcomeSchema, StepOutcomeModel, stepOutcomeService);
  }


  // public async getStepOutcomesForStep(req: Request, resp: Response, next: NextFunction): Promise<void> {
  //   const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
  //   const _stepId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.stepId);
  //   const response: ResponseWrapper = (resp as any).body;

  //   const steps = await stepOutcomeService.findStepOutcomesForStep(_orgId, _stepId, req.query.responseFields);

  //   if (_.isArray(steps) && steps.length === 0) {
  //     next(new MissingObjectError(`No step outcomes found for step ${_stepId}.`));
  //   }
  //   else {
  //     response.data = convertResponseData(StepOutcomeSchema, steps);
  //     next();
  //   }
  // }


  public async getStepOutcomesForTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const _taskOutcomeId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.taskOutcomeId);
    const response: ResponseWrapper = (resp as any).body;

    const steps = await stepOutcomeService.findStepOutcomesForTask(_orgId, _taskOutcomeId, null, req.query.responseFields);

    if (_.isArray(steps) && steps.length === 0) {
      next(new MissingObjectError(`No step outcomes found for task outcome ${_taskOutcomeId}.`));
    }
    else {
      response.data = convertResponseData(StepOutcomeSchema, steps);
      next();
    }
  }


  public async getStepOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
      const response: ResponseWrapper = (resp as any).body;
      const stepOutcome = await stepOutcomeService.findStepOutcome(_orgId, new mongodb.ObjectId(req.params.stepOutcomeId), req.query.responseFields);

      if (_.isArray(stepOutcome) && stepOutcome.length === 0) {
        next(new MissingObjectError(`StepOutcome ${req.params.stepOutcomeId} not found.`));
      }
      else {
        response.data = convertResponseData(StepOutcomeSchema, stepOutcome[0]);
        next();
      }
    }
    catch (err) {
      // If req.params.stepOutcomeId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`StepOutcome ${req.params.stepOutcomeId} not found.`));
      }
      else {
        next(err);
      }
    }
  }


  public async createStepOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newStepOutcome = await stepOutcomeService.createStepOutcome(_orgId, convertRequestData(StepOutcomeSchema, req.body), req.header('correlationId'), req.query.responseFields);
      response.data = convertResponseData(StepOutcomeSchema, newStepOutcome);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async updateStepOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const logger: BaseLogger = (<any>req).logger;
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedStepOutcome: any = await stepOutcomeService.updateStepOutcome(_orgId, new mongodb.ObjectId(req.params.stepOutcomeId), convertRequestData(StepOutcomeSchema, req.body), logger, null, req.header('correlationId'), req.query.responseFields);

      if (_.isArray(updatedStepOutcome) && updatedStepOutcome.length === 0) {
        next(new MissingObjectError(`StepOutcome ${req.params.stepOutcomeId} not found.`));
      }
      else {
        response.data = convertResponseData(StepOutcomeSchema, updatedStepOutcome);
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }
}

export const stepOutcomeController = new StepOutcomeController();