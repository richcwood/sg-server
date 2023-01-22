import {Request, Response, NextFunction, response} from "express";
import {ResponseWrapper, ResponseCode} from "../utils/Types";
import {TaskSchema, TaskModel} from "../domain/Task";
import {defaultBulkGet} from "../utils/BulkGet";
import {taskService} from "../services/TaskService";
import {MissingObjectError} from "../utils/Errors";
import {Error} from "mongoose";
import {convertData as convertResponseData} from "../utils/ResponseConverters";
import {convertData as convertRequestData} from "../utils/RequestConverters";
import {BaseLogger} from "../../shared/SGLogger";
import * as _ from "lodash";
import * as mongodb from "mongodb";

export class TaskController {
  public async getManyTasks(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    defaultBulkGet({_teamId}, req, resp, next, TaskSchema, TaskModel, taskService);
  }

  // public async getTasksForJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
  //     const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
  //     const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobId);
  //     const response: ResponseWrapper = (resp as any).body;

  //     const tasks = await taskService.findAllJobTasks(_teamId, _jobId, (<string>req.query.responseFields));

  //     if (_.isArray(tasks) && tasks.length === 0) {
  //         return next(new MissingObjectError(`No tasks found for job ${_jobId}.`));
  //     }
  //     else {
  //         response.data = convertResponseData(TaskSchema, tasks);
  //         return next();
  //     }
  // }

  public async getTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = (resp as any).body;
      const task = await taskService.findTask(
        _teamId,
        new mongodb.ObjectId(req.params.taskId),
        <string>req.query.responseFields
      );

      if (_.isArray(task) && task.length === 0) {
        return next(new MissingObjectError(`Task ${req.params.taskId} not found.`));
      } else {
        response.data = convertResponseData(TaskSchema, task[0]);
        return next();
      }
    } catch (err) {
      // If req.params.taskId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        return next(new MissingObjectError(`Task ${req.params.taskId} not found.`));
      } else {
        return next(err);
      }
    }
  }

  public async deleteTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._jobId);
      response.data = await taskService.deleteTask(_teamId, _jobId, req.header("correlationId"));
      response.statusCode = ResponseCode.OK;
      return next();
    } catch (err) {
      return next(err);
    }
  }

  public async createTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const newTask = await taskService.createTask(
        _teamId,
        convertRequestData(TaskSchema, req.body),
        req.header("correlationId"),
        <string>req.query.responseFields
      );
      response.data = convertResponseData(TaskSchema, newTask);
      response.statusCode = ResponseCode.CREATED;
      return next();
    } catch (err) {
      return next(err);
    }
  }

  public async updateTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const logger: BaseLogger = (<any>req).logger;
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const updatedTask: any = await taskService.updateTask(
        _teamId,
        new mongodb.ObjectId(req.params.taskId),
        convertRequestData(TaskSchema, req.body),
        logger,
        null,
        req.header("correlationId"),
        <string>req.query.responseFields
      );

      if (_.isArray(updatedTask) && updatedTask.length === 0) {
        return next(new MissingObjectError(`Task ${req.params.taskId} not found.`));
      } else {
        response.data = convertResponseData(TaskSchema, updatedTask);
        response.statusCode = ResponseCode.OK;
        return next();
      }
    } catch (err) {
      return next(err);
    }
  }
}

export const taskController = new TaskController();
