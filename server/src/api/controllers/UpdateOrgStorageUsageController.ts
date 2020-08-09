import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { updateOrgStorageUsageService } from '../services/UpdateOrgStorageUsageService';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { MongoRepo } from '../../shared/MongoLib';


export class UpdateOrgStorageUsageController {
    public async updateOrgStorageUsage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const res = await updateOrgStorageUsageService.updateDailyOrgStorageUsage(_orgId, req.body, req.header('correlationId'), req.query.responseFields);
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const updateOrgStorageUsageController = new UpdateOrgStorageUsageController();