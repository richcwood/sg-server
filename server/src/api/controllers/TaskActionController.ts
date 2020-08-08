import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { taskActionService } from '../services/TaskActionService';
import { BaseLogger } from '../../shared/KikiLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class TaskActionController {

    public async republishTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskActionService.republishTask(_orgId, new mongodb.ObjectId(req.params.taskId));
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async requeueTask(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const logger: BaseLogger = (<any>req).logger;
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await taskActionService.requeueTask(_orgId, new mongodb.ObjectId(req.params.taskId), req.body, logger);
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const taskActionController = new TaskActionController();