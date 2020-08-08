import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { jobActionService } from '../services/JobActionService';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { BaseLogger } from '../../shared/KikiLogger';


export class JobActionController {
    public async interruptJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const logger: BaseLogger = (<any>req).logger;
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await jobActionService.interruptJob(_orgId, new mongodb.ObjectId(req.params.jobId), logger);
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
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await jobActionService.restartJob(_orgId, new mongodb.ObjectId(req.params.jobId), logger);
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
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = resp['body'];
            const res = await jobActionService.cancelJob(_orgId, new mongodb.ObjectId(req.params.jobId), logger);
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