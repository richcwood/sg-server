import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { teamInviteService } from '../services/TeamInviteService';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class TeamInviteController {
    public async inviteUserToTeamDirect(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const res = await teamInviteService.inviteUserToTeamDirect(_teamId, req.body, logger);
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const teamInviteController = new TeamInviteController();
