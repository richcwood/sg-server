import { userService } from './UserService';
import { SGUtils } from '../../shared/SGUtils';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
const jwt = require('jsonwebtoken');
import * as config from 'config';
import * as bcrypt from 'bcrypt';

export class ForgotPasswordService {
    public async requestReset(data: any, logger: BaseLogger): Promise<object> {
        if (!data.email) throw new ValidationError('Request missing "email" parameter');

        let userModel: any = undefined;
        const queryRes: any = await userService.findAllUsersInternal({ email: data.email });
        if (_.isArray(queryRes) && queryRes.length > 0) {
            userModel = queryRes[0];
        }

        if (userModel) {
            if (!userModel.emailConfirmed) throw new ValidationError('Email address not verified');

            if (!userModel.passwordHash) {
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(SGUtils.makeid(12), salt);
                userModel.passwordHash = passwordHash;
                await userModel.save();
            }

            const secret = `${userModel.passwordHash}${userModel.dateCreated.toISOString()}`;
            const jwtExpiration = Date.now() + 1000 * 60 * 5; // 5 minutes
            let token = jwt.sign(
                {
                    id: userModel._id,
                    email: userModel.email,
                    exp: Math.floor(jwtExpiration / 1000),
                },
                secret
            ); //KeysUtil.getPrivate()); // todo - create a public / private key

            let url = config.get('WEB_CONSOLE_BASE_URL');
            const port = config.get('WEB_CONSOLE_PORT');

            if (port != '') url += `:${port}`;
            let resetPasswordLink = `${url}/?resetPasswordToken=${token}&id=${userModel._id.toHexString()}`;

            // let apiUrl = config.get('API_BASE_URL');
            // const apiVersion = config.get('API_VERSION');
            // const apiPort = config.get('API_PORT');

            // if (apiPort != '')
            //     apiUrl += `:${apiPort}`
            // let resetPasswordLink = `${apiUrl}/api/${apiVersion}/reset/${userModel._id.toHexString()}/${token}`;

            await SGUtils.SendPasswordResetEmail(userModel.email, resetPasswordLink, logger);
        } else {
            await SGUtils.SendPasswordResetInvalidEmail(data.email, logger);
        }

        return { result: 'success' };
    }
}

export const forgotPasswordService = new ForgotPasswordService();
