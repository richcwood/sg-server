import * as bcrypt from 'bcrypt';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as mongodb from 'mongodb';

const jwt = require('jsonwebtoken');

import { UserSchema, UserModel } from '../domain/User';

import { userService } from './UserService';

import { BaseLogger } from '../../shared/SGLogger';
import { SGUtils } from '../../shared/SGUtils';

import { MissingObjectError, ValidationError } from '../utils/Errors';

const environment = process.env.NODE_ENV || 'development';

export class SignupService {
    public async signupNewUserOAuth(data: any, logger: BaseLogger): Promise<object> {
        if (!data.email) throw new ValidationError(`Request body missing "email" parameter`);

        const queryRes: any = await userService.findAllUsersInternal({ email: data.email });
        if (_.isArray(queryRes) && queryRes.length > 0) throw new ValidationError(`User already exists`);

        let userModel: any = new UserModel(data);
        userModel.hasAcceptedTerms = true;
        userModel.emailConfirmed = true;
        userModel = await userModel.save();

        SGUtils.NewUserNotification(userModel, logger);

        return userModel;
    }

    public async signupNewUser(data: any, logger: BaseLogger): Promise<object> {
        if (!data.email) throw new ValidationError(`Request body missing "email" parameter`);

        let userModel: any = undefined;

        let userExistsAndConfirmed = false;
        const queryRes: any = await userService.findAllUsersInternal({ email: data.email });
        if (_.isArray(queryRes) && queryRes.length > 0) {
            userModel = queryRes[0];
            if (userModel.emailConfirmed) userExistsAndConfirmed = true;
        }

        // if (userExistsAndConfirmed) {
        //     userModel = queryRes[0];
        //     let userName = data.email.split('@')[0];
        //     if (userModel.name)
        //         userName = userModel.name;
        //     await SGUtils.SendConfirmEmailAlreadyExistsEmail(userName, userModel.email);
        // } else {
        //     if (!userModel)
        //         userModel = new UserModel(data);

        //     userModel.emailConfirmCode = SGUtils.makeNumericId();
        //     userModel.emailConfirmCodeExpiration = moment(new Date()).add(5, 'm').toDate().toISOString();
        //     userModel.hasAcceptedTerms = false;
        //     userModel = await userModel.save();

        //     await SGUtils.SendSignupConfirmEmail(userModel.emailConfirmCode, data.email);
        // }

        if (!userExistsAndConfirmed) {
            if (!userModel) userModel = new UserModel(data);

            userModel.emailConfirmCode = SGUtils.makeNumericId();
            userModel.emailConfirmCodeExpiration = moment(new Date()).add(5, 'm').toDate().toISOString();
            userModel.hasAcceptedTerms = false;
            userModel = await userModel.save();

            await SGUtils.SendSignupConfirmEmail(userModel.emailConfirmCode, data.email, logger);
        }

        return { email: userModel.email, confirmedEmailExists: userExistsAndConfirmed };
    }

    public async confirmNewInvitedUser(
        userEmail: string,
        _teamId: string,
        token: string,
        logger: BaseLogger
    ): Promise<object> {
        let updatedUser: any;
        const queryRes: any = await userService.findUserByEmail(
            userEmail,
            '_id email teamIds teamAccessRightIds teamIdsInvited teamIdsInactive passwordHash'
        );
        if (!queryRes || (_.isArray(queryRes) && queryRes.length < 1)) {
            throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');
        }
        const userModel: UserSchema = queryRes[0];

        if (userModel.emailConfirmed) return userModel;

        /// Check if the user is already in the team
        let userAlreadyInTeam: boolean = true;
        if (userModel.teamIds.indexOf(_teamId) < 0) userAlreadyInTeam = false;

        /// Verify the token - the secret comes from the user document - if no secret we can't verify the token
        let tokenIsValid: boolean = false;
        const filterRes = _.filter(userModel.teamIdsInvited, (o) => o._teamId == _teamId);
        let teamIdInviteSecret: string = undefined;
        if (_.isArray(filterRes) && filterRes.length > 0) teamIdInviteSecret = filterRes[0].inviteKey;
        if (!teamIdInviteSecret) {
            if (!userAlreadyInTeam)
                throw new ValidationError(
                    'Something went wrong. Please request a new invite from the team administrator.'
                );
        } else {
            /// We have the secret, use it to verify the token and then check the embedded data against the url params
            tokenIsValid = true;
            let jwtData;
            try {
                jwtData = jwt.verify(token, teamIdInviteSecret);
            } catch (err) {
                tokenIsValid = false;
            }
            if (tokenIsValid) {
                if (userModel._id.toHexString() != jwtData.id) tokenIsValid = false;
                else if (_teamId != jwtData.InvitedTeamId) tokenIsValid = false;
            }
        }

        if (!tokenIsValid)
            throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');

        updatedUser = await UserModel.findOneAndUpdate({ _id: userModel._id }, { emailConfirmed: true }, { new: true });

        if (environment != 'debug') {
            SGUtils.NewUserNotification(updatedUser, logger);
        }

        return updatedUser; // fully populated model
    }

    public async confirmNewUser(data: any, logger: BaseLogger): Promise<object> {
        if (!data.emailConfirmCode) throw new ValidationError(`Request body missing "emailConfirmCode" parameter`);

        if (!data.email) throw new ValidationError(`Request body missing "email" parameter`);

        let updatedUser: any;
        const queryRes: any = await userService.findUserByEmail(data.email);
        if (!queryRes || (_.isArray(queryRes) && queryRes.length < 1)) {
            throw new MissingObjectError('No user signed up with this email');
        }

        const user: UserSchema = queryRes[0];
        if (user.emailConfirmed) throw new ValidationError('Email address already confirmed');

        const userFilter = { email: data.email };
        if (!user.emailConfirmCode || !user.emailConfirmCodeExpiration)
            throw new MissingObjectError('Confirmation code not generated');

        /// If the confirmation code is incorrect, expire the current code now to prevent brute force attack
        if (data.emailConfirmCode != user.emailConfirmCode) {
            await UserModel.findOneAndUpdate(userFilter, {
                $unset: { emailConfirmCodeExpiration: '', emailConfirmCode: '' },
            });
            throw new ValidationError('Invalid or expired confirmation code');
        }

        const dteNow: number = new Date().valueOf();
        const dteExp: number = new Date(user.emailConfirmCodeExpiration).valueOf();
        if (dteExp - dteNow < 0) {
            throw new ValidationError('Invalid or expired confirmation code');
        }

        updatedUser = await UserModel.findOneAndUpdate(
            userFilter,
            { emailConfirmed: true, $unset: { emailConfirmCodeExpiration: '', emailConfirmCode: '' } },
            { new: true }
        );

        if (environment != 'debug') {
            SGUtils.NewUserNotification(updatedUser, logger);
        }

        return updatedUser; // fully populated model
    }

    public async oauthSetup(id: mongodb.ObjectId, data: any, responseFields?: string): Promise<object> {
        const filter = { _id: id };

        let updatedUser: any;
        // const user: UserSchema = await userService.findUser(id);

        // if (!user.emailConfirmed)
        //     throw new ValidationError('Email address not verified');

        let update: any = Object.assign({ hasAcceptedTerms: true, emailConfirmed: true }, data);

        updatedUser = await UserModel.findOneAndUpdate(filter, update, { new: true }).select(responseFields);

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return userService.findUser(updatedUser._id, responseFields);
        } else {
            return updatedUser; // fully populated model
        }
    }

    public async setInitialPassword(id: mongodb.ObjectId, data: any, responseFields?: string): Promise<object> {
        if (!data.password) throw new ValidationError(`Request body missing "password" parameter`);

        const filter = { _id: id };

        let updatedUser: any;
        // const user: UserSchema = await userService.findUser(id);

        // if (!user.emailConfirmed)
        //     throw new ValidationError('Email address not verified');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);

        let update: any = Object.assign(
            { passwordHash: passwordHash, hasAcceptedTerms: true, emailConfirmed: true },
            data
        );

        updatedUser = await UserModel.findOneAndUpdate(filter, update, { new: true }).select(responseFields);

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return userService.findUser(updatedUser._id, responseFields);
        } else {
            return updatedUser; // fully populated model
        }
    }
}

export const signupService = new SignupService();
