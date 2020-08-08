import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { taskOutcomeActionService } from '../services/TaskOutcomeActionService';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class TaskOutcomeActionController {

    public async interruptTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskOutcomeActionService.interruptTaskOutcome(_orgId, new mongodb.ObjectId(req.params.taskId));
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async restartTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskOutcomeActionService.restartTaskOutcome(_orgId, new mongodb.ObjectId(req.params.taskId));
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async cancelTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskOutcomeActionService.cancelTaskOutcome(_orgId, new mongodb.ObjectId(req.params.taskId));
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const taskOutcomeActionController = new TaskOutcomeActionController();