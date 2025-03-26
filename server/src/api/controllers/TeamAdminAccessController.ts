import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { UserSchema } from '../domain/User';
import { teamAdminAccessService } from '../services/TeamAdminAccessService';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
const jwt = require('jsonwebtoken');
import * as config from 'config';
import { BaseLogger } from '../../shared/SGLogger';

export class TeamAdminAccessController {
    public async grantTeamAdminAccess(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const logger: BaseLogger = (<any>req).logger;
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const teamAdminAccessUpdated: any = await teamAdminAccessService.grantTeamAdminAccess(
                _teamId,
                new mongodb.ObjectId(req.params.userId),
                logger,
                req.header('correlationId')
            );

            if (req.body.teamIds) {
                const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // 1 day
                const secret = process.env.secret;
                var token = jwt.sign(
                    {
                        id: teamAdminAccessUpdated._id,
                        email: teamAdminAccessUpdated.email,
                        teamIds: teamAdminAccessUpdated.teamIds,
                        teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(teamAdminAccessUpdated),
                        teamIdsInvited: teamAdminAccessUpdated.teamIdsInvited,
                        name: teamAdminAccessUpdated.name,
                        companyName: teamAdminAccessUpdated.companyName,
                        exp: Math.floor(jwtExpiration / 1000),
                    },
                    secret
                ); //KeysUtil.getPrivate()); // todo - create a public / private key

                resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
            }

            response.data = convertResponseData(UserSchema, teamAdminAccessUpdated);
            response.statusCode = ResponseCode.OK;

            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async revokeTeamAdminAccess(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const logger: BaseLogger = (<any>req).logger;
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const teamAdminAccessUpdated: any = await teamAdminAccessService.revokeTeamAdminAccess(
                _teamId,
                new mongodb.ObjectId(req.params.userId),
                logger,
                req.header('correlationId')
            );

            if (req.body.teamIds) {
                const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // 1 day
                const secret = process.env.secret;
                var token = jwt.sign(
                    {
                        id: teamAdminAccessUpdated._id,
                        email: teamAdminAccessUpdated.email,
                        teamIds: teamAdminAccessUpdated.teamIds,
                        teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(teamAdminAccessUpdated),
                        teamIdsInvited: teamAdminAccessUpdated.teamIdsInvited,
                        name: teamAdminAccessUpdated.name,
                        companyName: teamAdminAccessUpdated.companyName,
                        exp: Math.floor(jwtExpiration / 1000),
                    },
                    secret
                ); //KeysUtil.getPrivate()); // todo - create a public / private key

                resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
            }

            response.data = convertResponseData(UserSchema, teamAdminAccessUpdated);
            response.statusCode = ResponseCode.OK;

            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const teamAdminAccessController = new TeamAdminAccessController();
