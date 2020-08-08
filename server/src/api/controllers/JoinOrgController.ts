import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { UserSchema } from '../domain/User';
import { joinOrgService } from '../services/JoinOrgService';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
const jwt = require('jsonwebtoken');
import * as config from 'config';


export class JoinOrgController {


    public async userJoinOrg(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const user: any = await joinOrgService.userJoinOrg(new mongodb.ObjectId(req.params.userId), req.params.orgId, req.params.token);

            let jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
            const secret = config.get('secret');
            var token = jwt.sign({
                id: user._id,
                email: user.email,
                orgIds: user.orgIds,
                orgIdsInvited: user.orgIdsInvited,
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


    public async anonymousJoinOrg(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            if (!req.headers.userid)
                next(new ValidationError('Something went wrong. Please request a new invite link from the team administrator.'));
            const user: any = await joinOrgService.anonymousJoinOrg(new mongodb.ObjectId(req.headers.userid), req.params.token);

            let jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
            const secret = config.get('secret');
            var token = jwt.sign({
                id: user._id,
                email: user.email,
                orgIds: user.orgIds,
                orgIdsInvited: user.orgIdsInvited,
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

export const joinOrgController = new JoinOrgController();