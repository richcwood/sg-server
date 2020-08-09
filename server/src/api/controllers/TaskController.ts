import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { TaskSchema, TaskModel } from '../domain/Task';
import { defaultBulkGet } from '../utils/BulkGet';
import { taskService } from '../services/TaskService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { S3Access } from '../../shared/S3Access';
import { BaseLogger } from '../../shared/SGLogger';
import { TaskStatus } from '../../shared/Enums';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


const s3Access = new S3Access();

export class TaskController {

    public async getManyTasks(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        defaultBulkGet({ _orgId }, req, resp, next, TaskSchema, TaskModel, taskService);
    }


    // public async getTasksForJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
    //     const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    //     const _jobId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobId);
    //     const response: ResponseWrapper = (resp as any).body;

    //     const tasks = await taskService.findAllJobTasks(_orgId, _jobId, req.query.responseFields);

    //     if (_.isArray(tasks) && tasks.length === 0) {
    //         next(new MissingObjectError(`No tasks found for job ${_jobId}.`));
    //     }
    //     else {
    //         response.data = convertResponseData(TaskSchema, tasks);
    //         next();
    //     }
    // }


    public async getTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = (resp as any).body;
            const task = await taskService.findTask(_orgId, new mongodb.ObjectId(req.params.taskId), req.query.responseFields);

            if (_.isArray(task) && task.length === 0) {
                next(new MissingObjectError(`Task ${req.params.taskId} not found.`));
            }
            else {
                response.data = convertResponseData(TaskSchema, task[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.taskId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Task ${req.params.taskId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newTask = await taskService.createTask(_orgId, convertRequestData(TaskSchema, req.body), req.header('correlationId'), req.query.responseFields);
            response.data = convertResponseData(TaskSchema, newTask);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedTask: any = await taskService.updateTask(
                _orgId,
                new mongodb.ObjectId(req.params.taskId),
                convertRequestData(TaskSchema, req.body),
                logger,
                null,
                req.header('correlationId'),
                req.query.responseFields
            );

            if (_.isArray(updatedTask) && updatedTask.length === 0) {
                next(new MissingObjectError(`Task ${req.params.taskId} not found.`));
            }
            else {
                response.data = convertResponseData(TaskSchema, updatedTask);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }
}

export const taskController = new TaskController();