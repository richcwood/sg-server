import { Request, Response, NextFunction, response } from "express";
import { ResponseWrapper, ResponseCode } from "../utils/Types";
import { StepDefSchema, StepDefModel } from "../domain/StepDef";
import { defaultBulkGet } from "../utils/BulkGet";
import { stepDefService } from "../services/StepDefService";
import { MissingObjectError } from "../utils/Errors";
import { Error } from "mongoose";
import { convertData as convertResponseData } from "../utils/ResponseConverters";
import { convertData as convertRequestData } from "../utils/RequestConverters";
import * as _ from "lodash";
import * as mongodb from "mongodb";

export class StepDefController {
  public async getManyStepDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    defaultBulkGet({ _teamId }, req, resp, next, StepDefSchema, StepDefModel, stepDefService);
  }

  // public async getStepsForTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
  //   const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
  //   const _taskDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.taskDefId);
  //   const response: ResponseWrapper = (resp as any).body;

  //   const steps = await stepDefService.findAllStepDefs(_teamId, _taskDefId, (<string>req.query.responseFields));

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
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = (resp as any).body;
      const stepDef: StepDefSchema = await stepDefService.findStepDef(
        _teamId,
        new mongodb.ObjectId(req.params.stepDefId),
        <string>req.query.responseFields
      );

      if (!stepDef) {
        next(new MissingObjectError(`StepDef ${req.params.stepDefId} not found.`));
      } else {
        response.data = convertResponseData(StepDefSchema, stepDef);
        next();
      }
    } catch (err) {
      // If req.params.stepDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        next(new MissingObjectError(`StepDef ${req.params.stepDefId} not found.`));
      } else {
        next(err);
      }
    }
  }

  public async createStepDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const newStepDef = await stepDefService.createStepDef(
        _teamId,
        convertRequestData(StepDefSchema, req.body),
        req.get("correlationId"),
        <string>req.query.responseFields
      );
      response.data = convertResponseData(StepDefSchema, newStepDef);
      response.statusCode = ResponseCode.CREATED;
      next();
    } catch (err) {
      next(err);
    }
  }

  public async updateStepDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const updatedStepDef: any = await stepDefService.updateStepDef(
        _teamId,
        new mongodb.ObjectId(req.params.stepDefId),
        convertRequestData(StepDefSchema, req.body),
        req.get("correlationId"),
        <string>req.query.responseFields
      );

      if (_.isArray(updatedStepDef) && updatedStepDef.length === 0) {
        next(new MissingObjectError(`StepDef ${req.params.stepDefId} not found.`));
      } else {
        response.data = convertResponseData(StepDefSchema, updatedStepDef);
        response.statusCode = ResponseCode.OK;
        next();
      }
    } catch (err) {
      next(err);
    }
  }

  public async deleteStepDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      response.data = await stepDefService.deleteStepDef(
        _teamId,
        new mongodb.ObjectId(req.params.stepDefId),
        req.get("correlationId")
      );
      response.statusCode = ResponseCode.OK;
      next();
    } catch (err) {
      next(err);
    }
  }
}

export const stepDefController = new StepDefController();
