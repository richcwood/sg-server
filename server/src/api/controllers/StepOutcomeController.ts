import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { StepOutcomeSchema, StepOutcomeModel } from '../domain/StepOutcome';
import { defaultBulkGet } from '../utils/BulkGet';
import { stepOutcomeService } from '../services/StepOutcomeService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as config from 'config';


export class StepOutcomeController {

  public async getManyStepOutcomes(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    defaultBulkGet({ _teamId }, req, resp, next, StepOutcomeSchema, StepOutcomeModel, stepOutcomeService);
  }


  // public async getStepOutcomesForStep(req: Request, resp: Response, next: NextFunction): Promise<void> {
  //   const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
  //   const _stepId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.stepId);
  //   const response: ResponseWrapper = (resp as any).body;

  //   const steps = await stepOutcomeService.findStepOutcomesForStep(_teamId, _stepId, (<string>req.query.responseFields));

  //   if (_.isArray(steps) && steps.length === 0) {
  //     next(new MissingObjectError(`No step outcomes found for step ${_stepId}.`));
  //   }
  //   else {
  //     response.data = convertResponseData(StepOutcomeSchema, steps);
  //     next();
  //   }
  // }


  public async getStepOutcomesForTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const _taskOutcomeId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.taskOutcomeId);
    const response: ResponseWrapper = (resp as any).body;

    const steps = await stepOutcomeService.findStepOutcomesForTask(_teamId, _taskOutcomeId, null, (<string>req.query.responseFields));

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
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = (resp as any).body;
      const stepOutcome = await stepOutcomeService.findStepOutcome(_teamId, new mongodb.ObjectId(req.params.stepOutcomeId), (<string>req.query.responseFields));

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


  public async deleteStepOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp['body'];
    try {
      const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._jobId);
      response.data = await stepOutcomeService.deleteStepOutcome(_teamId, _jobId, req.header('correlationId'));
      response.statusCode = ResponseCode.OK;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async createStepOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
    let _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    if (_teamId.toHexString() == config.get('sgAdminTeam') && req.body._teamId && req.body._teamId != _teamId.toHexString())
      _teamId = new mongodb.ObjectId(req.body._teamId);
    const response: ResponseWrapper = resp['body'];
    try {
      const newStepOutcome = await stepOutcomeService.createStepOutcome(_teamId, convertRequestData(StepOutcomeSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
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
    let _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    if (_teamId.toHexString() == config.get('sgAdminTeam') && req.body._teamId && req.body._teamId != _teamId.toHexString())
      _teamId = new mongodb.ObjectId(req.body._teamId);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedStepOutcome: any = await stepOutcomeService.updateStepOutcome(_teamId, new mongodb.ObjectId(req.params.stepOutcomeId), convertRequestData(StepOutcomeSchema, req.body), logger, null, req.header('correlationId'), (<string>req.query.responseFields));

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