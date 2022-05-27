import { Request, Response, NextFunction, response } from "express";
import { ResponseWrapper, ResponseCode } from "../utils/Types";
import { TaskDefSchema, TaskDefModel } from "../domain/TaskDef";
import { defaultBulkGet } from "../utils/BulkGet";
import { taskDefService } from "../services/TaskDefService";
import { stepDefService } from "../services/StepDefService";
import { MissingObjectError } from "../utils/Errors";
import { Error } from "mongoose";
import { convertData as convertResponseData } from "../utils/ResponseConverters";
import { convertData as convertRequestData } from "../utils/RequestConverters";
import * as _ from "lodash";
import * as mongodb from "mongodb";

export class TaskDefController {
  public async getManyTaskDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    defaultBulkGet({ _teamId }, req, resp, next, TaskDefSchema, TaskDefModel, taskDefService);
  }

  // public async getTaskDefsForJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
  //   const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
  //   const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobDefId);
  //   const response: ResponseWrapper = (resp as any).body;

  //   const taskDefs = await taskDefService.findJobDefTaskDefs(_teamId, _jobDefId, (<string>req.query.responseFields));

  //   // if (_.isArray(taskDefs) && taskDefs.length === 0) {
  //   //   next(new MissingObjectError(`No task defs found for job def ${_jobDefId}.`));
  //   // }
  //   // else {
  //     response.data = convertResponseData(TaskDefSchema, taskDefs);
  //     next();
  //   // }
  // }

  public async getTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = (resp as any).body;
      const taskDef: TaskDefSchema = await taskDefService.findTaskDef(
        _teamId,
        new mongodb.ObjectId(req.params.taskDefId),
        <string>req.query.responseFields
      );

      if (!taskDef) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      } else {
        response.data = convertResponseData(TaskDefSchema, taskDef[0]);
        next();
      }
    } catch (err) {
      // If req.params.taskDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      } else {
        next(err);
      }
    }
  }

  public async createTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const newTaskDef = await taskDefService.createTaskDef(
        _teamId,
        convertRequestData(TaskDefSchema, req.body),
        req.get("correlationId"),
        <string>req.query.responseFields
      );
      response.data = convertResponseData(TaskDefSchema, newTaskDef);
      response.statusCode = ResponseCode.CREATED;
      next();
    } catch (err) {
      next(err);
    }
  }

  public async updateTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const updatedTaskDef: any = await taskDefService.updateTaskDef(
        _teamId,
        new mongodb.ObjectId(req.params.taskDefId),
        convertRequestData(TaskDefSchema, req.body),
        req.get("correlationId"),
        <string>req.query.responseFields
      );

      if (_.isArray(updatedTaskDef) && updatedTaskDef.length === 0) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      } else {
        response.data = convertResponseData(TaskDefSchema, updatedTaskDef);
        response.statusCode = ResponseCode.OK;
        next();
      }
    } catch (err) {
      next(err);
    }
  }

  public async deleteTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const taskDef: TaskDefSchema = await taskDefService.findTaskDef(
        _teamId,
        new mongodb.ObjectId(req.params.taskDefId),
        <string>req.query.responseFields
      );

      if (!taskDef) {
        return next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      } else {
        // First delete all of the step defs associated with the task
        const stepDefIds = await stepDefService.findAllStepDefs(_teamId, new mongodb.ObjectId(taskDef._id), "_id");

        for (const { _id } of stepDefIds) {
          await stepDefService.deleteStepDef(_teamId, new mongodb.ObjectId(_id), req.get("correlationId"));
        }

        // now delete the actual task
        response.data = taskDefService.deleteTaskDef(
          _teamId,
          new mongodb.ObjectId(taskDef._id),
          req.get("correlationId")
        );
        response.statusCode = ResponseCode.OK;
        next();
      }
    } catch (err) {
      // If req.params.taskDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      } else {
        next(err);
      }
    }
  }
}

export const taskDefController = new TaskDefController();
