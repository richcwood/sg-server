import { UserSchema, UserModel } from '../domain/User';
import { TeamSchema, TeamModel } from '../domain/Team';
import { userService } from './UserService';
import { SGUtils } from '../../shared/SGUtils';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
const jwt = require('jsonwebtoken');
import { v4 as uuidv4 } from 'uuid';
import * as config from 'config';
import { teamService } from './TeamService';
import * as mongodb from 'mongodb';


export class TeamInviteService {
    public async inviteUserToTeamDirect(_teamId: mongodb.ObjectId, data: any, logger: BaseLogger): Promise<object> {
        if (!data.email)
            throw new ValidationError('Request missing "email" parameter');
        if (!data._userId)
            throw new ValidationError('Request missing "_userId" parameter');

        const team: TeamSchema = await teamService.findTeam(_teamId, 'name');
        if (!team)
            throw new MissingObjectError('Invalid team');

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

        if (userModel.teamIdsInactive.indexOf(_teamId) >= 0) {
            SGUtils.removeItemFromArray(userModel.teamIdsInactive, _teamId);
            // userModel.teamIds.push(_teamId.toHexString());
            // await userModel.save();
        }

        if (userModel.teamIds.indexOf(_teamId) >= 0)
            return { result: 'success' };

        const teamIdsInvited = userModel.teamIdsInvited.map(invite => invite._teamId.toHexString());
        if (teamIdsInvited.indexOf(_teamId.toHexString()) >= 0) {
            let newTeamIdsInvited: any[] = [];
            for (let i = 0; i < userModel.teamIdsInvited.length; i++) {
                if (userModel.teamIdsInvited[i]._teamId.toHexString() != _teamId.toHexString()) {
                    newTeamIdsInvited.push(userModel.teamIdsInvited[i]);
                }
            }
            userModel.teamIdsInvited = newTeamIdsInvited;
        }

        const secret = uuidv4();

        userModel.teamIdsInvited.push({ _teamId: _teamId, inviteKey: secret });
        await userModel.save();

        const jwtExpiration = Date.now() + (1000 * 60 * 5); // 5 minutes
        let token = jwt.sign({
            id: userModel._id,
            InvitedTeamId: team._id,
            InvitedTeamName: team.name,
            email: userModel.email,
            emailConfirmed: true,
            exp: Math.floor(jwtExpiration / 1000)
        }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

        let url = config.get('WEB_CONSOLE_BASE_URL');
        const port = config.get('WEB_CONSOLE_PORT');

        if (port != '')
            url += `:${port}`
        let acceptInviteLink = `${url}/?invitedTeamToken=${token}`;

        console.log(acceptInviteLink);

        await SGUtils.SendTeamInviteEmail(team, inviter, userModel.email, acceptInviteLink, logger);

        return { result: 'success' };
    }
}

export const teamInviteService = new TeamInviteService();