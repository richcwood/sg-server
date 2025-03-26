import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { UserSchema } from '../domain/User';
import { passwordResetService } from '../services/PasswordResetService';
import { MissingObjectError } from '../utils/Errors';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { BaseLogger } from '../../shared/SGLogger';
const jwt = require('jsonwebtoken');
import * as _ from 'lodash';
import * as config from 'config';

export class PasswordResetController {
    public async updatePassword(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            const updatedUser: any = await passwordResetService.updatePassword(
                req.body,
                logger,
                <string>req.query.responseFields
            );

            if (_.isArray(updatedUser) && updatedUser.length === 0) {
                return next(new MissingObjectError(`User ${req.params.userId} not found.`));
                return;
            }

            const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // x minute(s)

            const secret = process.env.secret;
            var token = jwt.sign(
                {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    teamIds: updatedUser.teamIds,
                    teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(updatedUser),
                    teamIdsInvited: updatedUser.teamIdsInvited,
                    name: updatedUser.name,
                    companyName: updatedUser.companyName,
                    exp: Math.floor(jwtExpiration / 1000),
                },
                secret
            ); //KeysUtil.getPrivate()); // todo - create a public / private key

            // todo - secure: true
            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            response.data = convertResponseData(UserSchema, updatedUser);
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const passwordResetController = new PasswordResetController();
