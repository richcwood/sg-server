import { UserSchema, UserModel } from '../domain/User';
import { OrgSchema, OrgModel } from '../domain/Org';
import { userService } from './UserService';
import { KikiUtils } from '../../shared/KikiUtils';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { BaseLogger } from '../../shared/KikiLogger';
import * as _ from 'lodash';
const jwt = require('jsonwebtoken');
import { v4 as uuidv4 } from 'uuid';
import * as config from 'config';
import { orgService } from './OrgService';
import * as mongodb from 'mongodb';


export class OrgInviteService {
    public async inviteUserToOrgDirect(_orgId: mongodb.ObjectId, data: any, logger: BaseLogger): Promise<object> {
        if (!data.email)
            throw new ValidationError('Request missing "email" parameter');
        if (!data._userId)
            throw new ValidationError('Request missing "_userId" parameter');

        const org: OrgSchema = await orgService.findOrg(_orgId, 'name');
        if (!org)
            throw new MissingObjectError('Invalid org');

        const inviter: UserSchema = await userService.findUser(data._userId, 'name email companyName');
        if (!inviter)
            throw new ValidationError('Invalid user');

        let userModel: any = undefined;
        const queryRes: any = await userService.findUserByEmail(data.email);
        if (!queryRes || (_.isArray(queryRes) && queryRes.length < 1)) {
            userModel = new UserModel({ email: data.email });
            await userModel.save();
        } else {
            userModel = queryRes[0];
        }

        if (userModel.orgIdsInactive.indexOf(_orgId) >= 0) {
            KikiUtils.removeItemFromArray(userModel.orgIdsInactive, _orgId);
            userModel.orgIds.push(_orgId);
            await userModel.save();
        }

        if (userModel.orgIds.indexOf(_orgId) >= 0)
            return { result: 'success' };

        const orgIdsInvited = userModel.orgIdsInvited.map(invite => invite._orgId);
        if (orgIdsInvited.indexOf(_orgId) >= 0) {
            let newOrgIdsInvited: any[] = [];
            for (let i = 0; i < userModel.orgIdsInvited.length; i++) {
                if (userModel.orgIdsInvited[i]._orgId != _orgId) {
                    newOrgIdsInvited.push(userModel.orgIdsInvited[i]);
                }
            }
            userModel.orgIdsInvited = newOrgIdsInvited;
        }

        const secret = uuidv4();

        userModel.orgIdsInvited.push({ _orgId: _orgId, inviteKey: secret });
        await userModel.save();

        const jwtExpiration = Date.now() + (1000 * 60 * 5); // 5 minutes
        let token = jwt.sign({
            id: userModel._id,
            InvitedOrgId: org._id,
            InvitedOrgName: org.name,
            email: userModel.email,
            emailConfirmed: true,
            exp: Math.floor(jwtExpiration / 1000)
        }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

        let url = config.get('WEB_CONSOLE_BASE_URL');
        const port = config.get('WEB_CONSOLE_PORT');

        if (port != '')
            url += `:${port}`
        let acceptInviteLink = `${url}/?invitedOrgToken_direct=${token}`;

        await KikiUtils.SendOrgInviteEmail(org, inviter, userModel.email, acceptInviteLink, logger);

        return { result: 'success' };
    }
}

export const orgInviteService = new OrgInviteService();