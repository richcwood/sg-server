import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { taskOutcomeActionService } from '../services/TaskOutcomeActionService';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class TaskOutcomeActionController {

    public async interruptTaskOutcome(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskOutcomeActionService.interruptTaskOutcome(_teamId, new mongodb.ObjectId(req.params.taskId));
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
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskOutcomeActionService.restartTaskOutcome(_teamId, new mongodb.ObjectId(req.params.taskId));
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
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskOutcomeActionService.cancelTaskOutcome(_teamId, new mongodb.ObjectId(req.params.taskId));
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