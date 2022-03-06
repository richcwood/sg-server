import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { UserSchema } from '../domain/User';
import { joinTeamService } from '../services/JoinTeamService';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
const jwt = require('jsonwebtoken');
import * as config from 'config';


export class JoinTeamController {


    public async userJoinTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const user: any = await joinTeamService.userJoinTeam(new mongodb.ObjectId(req.params.userId), req.params.teamId, req.params.token);

            let jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
            const secret = config.get('secret');
            var token = jwt.sign({
                id: user._id,
                email: user.email,
                teamIds: user.teamIds,
                teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(user),
                teamIdsInvited: user.teamIdsInvited,
                name: user.name,
                companyName: user.companyName,
                exp: Math.floor(jwtExpiration / 1000)
            }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            response.data = convertResponseData(UserSchema, user);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async anonymousJoinTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            if (!req.headers.userid)
                next(new ValidationError('Something went wrong. Please request a new invite link from the team administrator.'));
            const user: any = await joinTeamService.anonymousJoinTeam(new mongodb.ObjectId(<string>req.headers.userid), req.params.token);

            let jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
            const secret = config.get('secret');
            var token = jwt.sign({
                id: user._id,
                email: user.email,
                teamIds: user.teamIds,
                teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(user),
                teamIdsInvited: user.teamIdsInvited,
                name: user.name,
                companyName: user.companyName,
                exp: Math.floor(jwtExpiration / 1000)
            }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            response.data = convertResponseData(UserSchema, user);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            console.log('\n\nBARTTT', err);
            next(err);
        }
    }
}

export const joinTeamController = new JoinTeamController();