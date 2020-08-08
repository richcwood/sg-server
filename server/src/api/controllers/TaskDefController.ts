import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { TaskDefSchema, TaskDefModel } from '../domain/TaskDef';
import { defaultBulkGet } from '../utils/BulkGet';
import { taskDefService } from '../services/TaskDefService';
import { stepDefService } from '../services/StepDefService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class TaskDefController {

  public async getManyTaskDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    defaultBulkGet({ _orgId }, req, resp, next, TaskDefSchema, TaskDefModel, taskDefService);
  }


  // public async getTaskDefsForJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
  //   const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
  //   const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobDefId);
  //   const response: ResponseWrapper = (resp as any).body;

  //   const taskDefs = await taskDefService.findJobDefTaskDefs(_orgId, _jobDefId, req.query.responseFields);

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
      const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
      const response: ResponseWrapper = (resp as any).body;
      const taskDef = await taskDefService.findTaskDef(_orgId, new mongodb.ObjectId(req.params.taskDefId), req.query.responseFields);

      if (_.isArray(taskDef) && taskDef.length === 0) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      }
      else {
        response.data = convertResponseData(TaskDefSchema, taskDef[0]);
        next();
      }
    }
    catch (err) {
      // If req.params.taskDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }


  public async createTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newTaskDef = await taskDefService.createTaskDef(_orgId, convertRequestData(TaskDefSchema, req.body), req.get('correlationId'), req.query.responseFields);
      response.data = convertResponseData(TaskDefSchema, newTaskDef);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async updateTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedTaskDef: any = await taskDefService.updateTaskDef(_orgId, new mongodb.ObjectId(req.params.taskDefId), convertRequestData(TaskDefSchema, req.body), req.get('correlationId'), req.query.responseFields);

      if (_.isArray(updatedTaskDef) && updatedTaskDef.length === 0) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      }
      else {
        response.data = convertResponseData(TaskDefSchema, updatedTaskDef);
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }


  public async deleteTaskDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const taskDefs = await taskDefService.findTaskDef(_orgId, new mongodb.ObjectId(req.params.taskDefId), req.query.responseFields);

      if (_.isArray(taskDefs) && taskDefs.length === 0) {
        return next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      }
      else {
        const taskDef = taskDefs[0];
        // First delete all of the step defs associated with the task
        const stepDefIds = await stepDefService.findAllStepDefs(_orgId, new mongodb.ObjectId(taskDef._id), '_id');
        
        for(const {_id} of stepDefIds){
          await stepDefService.deleteStepDef(_orgId, new mongodb.ObjectId(_id), req.get('correlationId'));
        }

        // now delete the actual task
        response.data = taskDefService.deleteTaskDef(_orgId, new mongodb.ObjectId(taskDef._id), req.get('correlationId'));
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      // If req.params.taskDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`TaskDef ${req.params.taskDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }
}




export const taskDefController = new TaskDefController();