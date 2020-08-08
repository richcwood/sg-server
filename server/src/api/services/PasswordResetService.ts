import { UserSchema, UserModel } from '../domain/User';
import { userService } from './UserService';
import { KikiUtils } from '../../shared/KikiUtils';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { BaseLogger } from '../../shared/KikiLogger';
import * as _ from 'lodash';
const jwt = require('jsonwebtoken');
import * as mongodb from 'mongodb';
import * as bcrypt from 'bcrypt';


export class PasswordResetService {
    public async updatePassword(data: any, logger: BaseLogger, responseFields?: string): Promise<object> {
        /// Check if the invited user exists
        const _userId = new mongodb.ObjectId(data.id);
        const userModel: any = await userService.findUser(_userId, '_id email emailConfirmed passwordHash dateCreated');
        if (!userModel)
            throw new ValidationError('Something went wrong. Please request a new password reset link.');

        if (!userModel.emailConfirmed)
            throw new ValidationError('Email address not verified');

        /// Verify the token
        let tokenIsValid: boolean = true;
        const secret = `${userModel.passwordHash}${userModel.dateCreated.toISOString()}`;
        let jwtData;
        try {
            jwtData = jwt.verify(data.token, secret);
        } catch (err) {
            tokenIsValid = false;
        }
        if (tokenIsValid) {
            if (_userId.toHexString() != jwtData.id)
                tokenIsValid = false;
        }

        if (!tokenIsValid)
            throw new ValidationError('Something went wrong. Please request a new password reset link.');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);

        const updatedUser = await UserModel.findOneAndUpdate({ _id: _userId }, { passwordHash: passwordHash }, { new: true }).select(responseFields);

        await KikiUtils.SendPasswordResetConfirmationEmail(userModel.email, logger);

        return updatedUser;
    }
}

export const passwordResetService = new PasswordResetService();