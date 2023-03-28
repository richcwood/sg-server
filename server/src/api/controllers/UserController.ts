import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { UserSchema } from '../domain/User';
import { userService } from '../services/UserService';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
const jwt = require('jsonwebtoken');
import * as config from 'config';
import { BaseLogger } from '../../shared/SGLogger';
import * as accessRightsVerifier from '../../api/utils/AccessRightsVerifier';
import BitSet from 'bitset';

export class UserController {
    public async getManyUsers(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = (resp as any).body;
        const users = await userService.findAllUsersInTeam(_teamId, <string>req.query.responseFields);

        response.data = convertResponseData(UserSchema, users);

        return next();
    }

    public async getUser(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const response: ResponseWrapper = (resp as any).body;
            const user = await userService.findUser(
                new mongodb.ObjectId(req.params.userId),
                <string>req.query.responseFields
            );

            if (!user) {
                return next(new MissingObjectError(`User ${req.params.userId} not found.`));
            } else {
                response.data = convertResponseData(UserSchema, user);
                return next();
            }
        } catch (err) {
            // If req.params.userId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                if (req.params && req.params.userId)
                    return next(new MissingObjectError(`User ${req.params.userId} not found.`));
                else return next(new MissingObjectError(`User not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createUser(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const newUser = await userService.createUser(req.body, <string>req.query.responseFields);
            response.data = convertResponseData(UserSchema, newUser);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    // public async updateUser(req: Request, resp: Response, next: NextFunction): Promise<void> {
    //   const response: ResponseWrapper = resp['body'];
    //   try {
    //     const userUpdated: any = await userService.updateUser(new mongodb.ObjectId(req.params.userId), req.body, (<string>req.query.responseFields));

    //     if (req.body.teamIds) {
    //       const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
    //       const secret = config.get('secret');
    //       var token = jwt.sign({
    //         id: userUpdated._id,
    //         email: userUpdated.email,
    //         teamIds: userUpdated.teamIds,
    //         teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(userUpdated),
    //         teamIdsInvited: userUpdated.teamIdsInvited,
    //         name: userUpdated.name,
    //         companyName: userUpdated.companyName,
    //         exp: Math.floor(jwtExpiration / 1000)
    //       }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

    //       resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
    //     }

    //     if (_.isArray(userUpdated) && userUpdated.length === 0) {
    //       return next(new MissingObjectError(`User ${req.params.userId} not found.`));
    //     }
    //     else {
    //       response.data = convertResponseData(UserSchema, userUpdated);
    //       response.statusCode = ResponseCode.OK;
    //       return next();
    //     }
    //   }
    //   catch (err) {
    //     return next(err);
    //   }
    // }

    public async leaveTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const logger: BaseLogger = (<any>req).logger;

            const userIdToRemove: mongodb.ObjectId = new mongodb.ObjectId(req.params.userId);
            const userRemovedBy: mongodb.ObjectId = new mongodb.ObjectId(req.params.userId);
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const teamIdAsString: string = _teamId.toHexString();

            let authorized: boolean = false;
            if (userIdToRemove.toHexString() != userRemovedBy.toHexString()) {
                const teamAccessRightIds = req.headers.teamAccessRightIds;

                if (teamAccessRightIds && teamAccessRightIds[teamIdAsString]) {
                    const rightIdsToVerify = await accessRightsVerifier.convertAccessRightNamesToIds(['TEAM_GLOBAL']);
                    const userRightsBitset = BitSet.fromHexString(teamAccessRightIds[teamIdAsString]);

                    if (
                        rightIdsToVerify.some((rightId: number) => {
                            return userRightsBitset.get(rightId) === 1;
                        })
                    ) {
                        authorized = true;
                    } else {
                        authorized = false;
                    }
                }
            } else {
                authorized = true;
            }

            if (!authorized) {
                logger.LogError('User not authorized', {
                    Class: 'UserController',
                    Method: 'leaveTeam',
                    UserIdToRemove: userIdToRemove.toHexString(),
                    UserRemovedBy: userRemovedBy.toHexString(),
                    TeamId: teamIdAsString,
                });
                throw new ValidationError('User not authorized');
            }

            const userUpdated: any = await userService.leaveTeam(
                userIdToRemove,
                userRemovedBy,
                _teamId,
                logger,
                req.header('correlationId')
            );

            const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // 1 day
            const secret = config.get('secret');
            var token = jwt.sign(
                {
                    id: userUpdated._id,
                    email: userUpdated.email,
                    teamIds: userUpdated.teamIds,
                    teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(userUpdated),
                    teamIdsInvited: userUpdated.teamIdsInvited,
                    name: userUpdated.name,
                    companyName: userUpdated.companyName,
                    exp: Math.floor(jwtExpiration / 1000),
                },
                secret
            ); //KeysUtil.getPrivate()); // todo - create a public / private key

            // todo - secure: true
            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            if (_.isArray(userUpdated) && userUpdated.length === 0) {
                return next(new MissingObjectError(`User ${req.params.userId} not found.`));
            } else {
                response.data = convertResponseData(UserSchema, userUpdated);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async joinTeam(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const userUpdated: any = await userService.joinTeam(
                new mongodb.ObjectId(req.params.userId),
                req.params.teamId
            );

            const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // 1 day
            const secret = config.get('secret');
            var token = jwt.sign(
                {
                    id: userUpdated._id,
                    email: userUpdated.email,
                    teamIds: userUpdated.teamIds,
                    teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(userUpdated),
                    teamIdsInvited: userUpdated.teamIdsInvited,
                    name: userUpdated.name,
                    companyName: userUpdated.companyName,
                    exp: Math.floor(jwtExpiration / 1000),
                },
                secret
            ); //KeysUtil.getPrivate()); // todo - create a public / private key

            // todo - secure: true
            resp.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });

            if (_.isArray(userUpdated) && userUpdated.length === 0) {
                return next(new MissingObjectError(`User ${req.params.userId} not found.`));
            } else {
                response.data = convertResponseData(UserSchema, userUpdated);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
}

export const userController = new UserController();
