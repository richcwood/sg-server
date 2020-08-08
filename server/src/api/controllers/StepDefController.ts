import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { StepDefSchema, StepDefModel } from '../domain/StepDef';
import { defaultBulkGet } from '../utils/BulkGet';
import { stepDefService } from '../services/StepDefService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class StepDefController {

  public async getManyStepDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    defaultBulkGet({ _orgId }, req, resp, next, StepDefSchema, StepDefModel, stepDefService);
  }


  // public async getStepsForTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
  //   const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
  //   const _taskDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.taskDefId);
  //   const response: ResponseWrapper = (resp as any).body;

  //   const steps = await stepDefService.findAllStepDefs(_orgId, _taskDefId, req.query.responseFields);

  //   if (_.isArray(steps) && steps.length === 0) {
  //     next(new MissingObjectError(`No step def found for task def ${_taskDefId}.`));
  //   }
  //   else {
  //     response.data = convertResponseData(StepDefSchema, steps);
  //     next();
  //   }
  // }


  public async getStepDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
      const response: ResponseWrapper = (resp as any).body;
      const stepDef = await stepDefService.findStepDef(_orgId, new mongodb.ObjectId(req.params.stepDefId), req.query.responseFields);

      if (_.isArray(stepDef) && stepDef.length === 0) {
        next(new MissingObjectError(`StepDef ${req.params.stepDefId} not found.`));
      }
      else {
        response.data = convertResponseData(StepDefSchema, stepDef[0]);
        next();
      }
    }
    catch (err) {
      // If req.params.stepDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`StepDef ${req.params.stepDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }


  public async createStepDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newStepDef = await stepDefService.createStepDef(_orgId, convertRequestData(StepDefSchema, req.body), req.get('correlationId'), req.query.responseFields);
      response.data = convertResponseData(StepDefSchema, newStepDef);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async updateStepDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedStepDef: any = await stepDefService.updateStepDef(_orgId, new mongodb.ObjectId(req.params.stepDefId), convertRequestData(StepDefSchema, req.body), req.get('correlationId'), req.query.responseFields);

      if (_.isArray(updatedStepDef) && updatedStepDef.length === 0) {
        next(new MissingObjectError(`StepDef ${req.params.stepDefId} not found.`));
      }
      else {
        response.data = convertResponseData(StepDefSchema, updatedStepDef);
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }


  public async deleteStepDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      response.data = await stepDefService.deleteStepDef(_orgId, new mongodb.ObjectId(req.params.stepDefId), req.get('correlationId'));
      response.statusCode = ResponseCode.OK;
      next();
    }
    catch (err) {
      next(err);
    }
  }
}

export const stepDefController = new StepDefController();