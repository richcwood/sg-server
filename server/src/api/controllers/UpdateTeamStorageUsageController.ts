import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { updateTeamStorageUsageService } from '../services/UpdateTeamStorageUsageService';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class UpdateTeamStorageUsageController {
    public async updateTeamStorageUsage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const res = await updateTeamStorageUsageService.updateDailyTeamStorageUsage(_teamId, req.body, req.header('correlationId'), (<string>req.query.responseFields));
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const updateTeamStorageUsageController = new UpdateTeamStorageUsageController();