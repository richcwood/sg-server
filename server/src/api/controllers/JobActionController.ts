import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { jobActionService } from '../services/JobActionService';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { BaseLogger } from '../../shared/SGLogger';


export class JobActionController {
    public async interruptJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const logger: BaseLogger = (<any>req).logger;
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = resp['body'];
            const res = await jobActionService.interruptJob(_teamId, new mongodb.ObjectId(req.params.jobId), logger);
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async restartJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const logger: BaseLogger = (<any>req).logger;
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = resp['body'];
            const res = await jobActionService.restartJob(_teamId, new mongodb.ObjectId(req.params.jobId), logger);
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async cancelJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const logger: BaseLogger = (<any>req).logger;
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = resp['body'];
            const res = await jobActionService.cancelJob(_teamId, new mongodb.ObjectId(req.params.jobId), logger);
            response.data = res;
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const jobActionController = new JobActionController();