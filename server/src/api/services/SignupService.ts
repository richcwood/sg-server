import { convertData } from '../utils/ResponseConverters';
import { UserSchema, UserModel } from '../domain/User';
import { userService } from './UserService';
import * as mongodb from 'mongodb';
import { SGUtils } from '../../shared/SGUtils';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { BaseLogger } from '../../shared/SGLogger';
import * as moment from 'moment';
import * as _ from 'lodash';
import * as bcrypt from 'bcrypt';


export class SignupService {
    public async signupNewUser(data: any, logger: BaseLogger): Promise<object> {
        if (!data.email)
            throw new ValidationError(`Request body missing "email" parameter`);

        let userModel: any = undefined;

        let userExistsAndConfirmed = false;
        const queryRes: any = await userService.findAllUsersInternal({ email: data.email })
        if (_.isArray(queryRes) && queryRes.length > 0) {
            userModel = queryRes[0];
            if (userModel.emailConfirmed)
                userExistsAndConfirmed = true;
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
            if (!userModel)
                userModel = new UserModel(data);

            userModel.emailConfirmCode = SGUtils.makeNumericId();
            userModel.emailConfirmCodeExpiration = moment(new Date()).add(5, 'm').toDate().toISOString();
            userModel.hasAcceptedTerms = false;
            userModel = await userModel.save();

            await SGUtils.SendSignupConfirmEmail(userModel.emailConfirmCode, data.email, logger);
        }

        return { email: userModel.email, confirmedEmailExists: userExistsAndConfirmed };
    }


    public async confirmNewUser(data: any): Promise<object> {
        if (!data.emailConfirmCode)
            throw new ValidationError(`Request body missing "emailConfirmCode" parameter`);

        if (!data.email)
            throw new ValidationError(`Request body missing "email" parameter`);

        let updatedUser: any;
        const queryRes: any = await userService.findUserByEmail(data.email);
        if (!queryRes || (_.isArray(queryRes) && queryRes.length < 1)) {
            throw new MissingObjectError('No user signed up with this email');
        }

        const user: UserSchema = queryRes[0];
        if (user.emailConfirmed)
            throw new ValidationError('Email address already confirmed');

        const userFilter = { email: data.email };
        if (!user.emailConfirmCode || !user.emailConfirmCodeExpiration)
            throw new MissingObjectError('Confirmation code not generated');

        /// If the confirmation code is incorrect, expire the current code now to prevent brute force attack
        if (data.emailConfirmCode != user.emailConfirmCode) {
            await UserModel.findOneAndUpdate(userFilter, { $unset: { emailConfirmCodeExpiration: '', emailConfirmCode: '' } });
            throw new ValidationError('Invalid or expired confirmation code');
        }

        const dteNow: number = new Date().valueOf();
        const dteExp: number = new Date(user.emailConfirmCodeExpiration).valueOf();
        if ((dteExp - dteNow) < 0) {
            throw new ValidationError('Invalid or expired confirmation code');
        }

        updatedUser = await UserModel.findOneAndUpdate(userFilter, { emailConfirmed: true, $unset: { emailConfirmCodeExpiration: '', emailConfirmCode: '' }, }, { new: true });

        return updatedUser; // fully populated model
    }


    public async setInitialPassword(id: mongodb.ObjectId, data: any, responseFields?: string): Promise<object> {
        if (!data.password)
        throw new ValidationError(`Request body missing "password" parameter`);

        const filter = { _id: id };

        let updatedUser: any;
        // const user: UserSchema = await userService.findUser(id);

        // if (!user.emailConfirmed)
        //     throw new ValidationError('Email address not verified');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);

        let update: any = Object.assign({ passwordHash: passwordHash, hasAcceptedTerms: true, emailConfirmed: true }, data);

        updatedUser = await UserModel.findOneAndUpdate(filter, update, { new: true }).select(responseFields);

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return userService.findUser(updatedUser._id, responseFields);
        }
        else {
            return updatedUser; // fully populated model
        }
    }
}

export const signupService = new SignupService();