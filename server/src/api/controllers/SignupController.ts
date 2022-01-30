import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { UserSchema } from '../domain/User';
import { signupService } from '../services/SignupService';
import { MissingObjectError } from '../utils/Errors';
import { BaseLogger } from '../../shared/SGLogger';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
const jwt = require('jsonwebtoken');
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as config from 'config';


export class SignupController {
    public async signupNewUser(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            const res = await signupService.signupNewUser(req.body, logger);
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async confirmNewInvitedUser(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            const updatedUser: any = await signupService.confirmNewInvitedUser(req.params.userEmail, req.params.teamId, req.params.token, logger);

            if (_.isArray(updatedUser) && updatedUser.length === 0) {
                next(new MissingObjectError(`User ${req.body.email} not found.`));
                return;
            }

            const jwtExpiration = Date.now() + (5 * 60 * 1000); // x minute(s)

            const secret = config.get('secret');
            var token = jwt.sign({
                id: updatedUser._id,
                email: updatedUser.email,
                teamIds: updatedUser.teamIds,
                teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(updatedUser),
                teamIdsInvited: updatedUser.teamIdsInvited,
                name: updatedUser.name,
                companyName: updatedUser.companyName,
                exp: Math.floor(jwtExpiration / 1000)
            }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            response.data = convertResponseData(UserSchema, updatedUser);
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async confirmNewUser(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            const updatedUser: any = await signupService.confirmNewUser(req.body, logger);

            if (_.isArray(updatedUser) && updatedUser.length === 0) {
                next(new MissingObjectError(`User ${req.body.email} not found.`));
                return;
            }

            const jwtExpiration = Date.now() + (5 * 60 * 1000); // x minute(s)

            const secret = config.get('secret');
            var token = jwt.sign({
                id: updatedUser._id,
                email: updatedUser.email,
                teamIds: updatedUser.teamIds,
                teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(updatedUser),
                teamIdsInvited: updatedUser.teamIdsInvited,
                name: updatedUser.name,
                companyName: updatedUser.companyName,
                exp: Math.floor(jwtExpiration / 1000)
            }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            response.data = convertResponseData(UserSchema, updatedUser);
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async oauthSetup(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedUser: any = await signupService.oauthSetup(new mongodb.ObjectId(req.params.userId), req.body, (<string>req.query.responseFields));

            if (_.isArray(updatedUser) && updatedUser.length === 0) {
                next(new MissingObjectError(`User ${req.params.userId} not found.`));
                return;
            }

            const jwtExpiration = Date.now() + (24 * 60 * 60 * 1000); // x minute(s)

            const secret = config.get('secret');
            var token = jwt.sign({
                id: updatedUser._id,
                email: updatedUser.email,
                teamIds: updatedUser.teamIds,
                teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(updatedUser),
                teamIdsInvited: updatedUser.teamIdsInvited,
                name: updatedUser.name,
                companyName: updatedUser.companyName,
                exp: Math.floor(jwtExpiration / 1000)
            }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            response.data = convertResponseData(UserSchema, updatedUser);
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async setInitialPassword(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedUser: any = await signupService.setInitialPassword(new mongodb.ObjectId(req.params.userId), req.body, (<string>req.query.responseFields));

            if (_.isArray(updatedUser) && updatedUser.length === 0) {
                next(new MissingObjectError(`User ${req.params.userId} not found.`));
                return;
            }

            const jwtExpiration = Date.now() + (24 * 60 * 60 * 1000); // x minute(s)

            const secret = config.get('secret');
            var token = jwt.sign({
                id: updatedUser._id,
                email: updatedUser.email,
                teamIds: updatedUser.teamIds,
                teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(updatedUser),
                teamIdsInvited: updatedUser.teamIdsInvited,
                name: updatedUser.name,
                companyName: updatedUser.companyName,
                exp: Math.floor(jwtExpiration / 1000)
            }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            response.data = convertResponseData(UserSchema, updatedUser);
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const signupController = new SignupController();