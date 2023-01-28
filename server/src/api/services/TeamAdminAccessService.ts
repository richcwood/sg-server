import { convertData } from '../utils/ResponseConverters';
import { UserSchema, UserModel } from '../domain/User';
import { userService } from './UserService';
import { TeamSchema } from '../domain/Team';
import { teamService } from '../services/TeamService';
import * as mongodb from 'mongodb';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import * as _ from 'lodash';
import { BaseLogger } from '../../shared/SGLogger';
import { GetAccessRightIdsForTeamAdmin, GetAccessRightIdsForTeamUser } from '../../api/utils/Shared';

export class TeamAdminAccessService {
    public async grantTeamAdminAccess(
        _teamId: mongodb.ObjectId,
        _userId: mongodb.ObjectId,
        logger: BaseLogger,
        correlationId?: string
    ): Promise<object> {
        const filter = { _id: _userId };

        let updatedUser: any;
        const user: UserSchema = await userService.findUser(_userId, 'teamIds teamAccessRightIds');

        if (!user) {
            logger.LogError('User not found', {
                Class: 'TeamAdminAccessService',
                Method: 'enableTeamAdminAccess',
                TeamId: _teamId.toHexString(),
                UserId: _userId.toHexString(),
            });
            throw new MissingObjectError('User not found');
        }

        if (user.teamIds && user.teamIds.includes(_teamId.toHexString())) {
            if (!user.teamAccessRightIds) user.teamAccessRightIds = {};
            user.teamAccessRightIds[_teamId.toHexString()] = GetAccessRightIdsForTeamAdmin();
            updatedUser = await UserModel.findOneAndUpdate(
                filter,
                { teamAccessRightIds: user.teamAccessRightIds },
                { new: true }
            ).select('_id teamAccessRightIds');
        } else {
            logger.LogError('User not a team member', {
                Class: 'TeamAdminAccessService',
                Method: 'enableTeamAdminAccess',
                TeamId: _teamId.toHexString(),
                UserId: _userId.toHexString(),
            });
            throw new ValidationError('User not a team member');
        }

        const deltas = { _id: _userId, teamAccessRightIds: user.teamAccessRightIds };
        await rabbitMQPublisher.publish(
            _teamId,
            'User',
            correlationId,
            PayloadOperation.UPDATE,
            convertData(UserSchema, deltas)
        );

        return updatedUser;
    }

    public async revokeTeamAdminAccess(
        _teamId: mongodb.ObjectId,
        _userId: mongodb.ObjectId,
        logger: BaseLogger,
        correlationId?: string
    ): Promise<object> {
        const filter = { _id: _userId };

        let updatedUser: any;
        const user: UserSchema = await userService.findUser(_userId, 'teamIds teamAccessRightIds');

        if (!user) {
            logger.LogError('User not found', {
                Class: 'TeamAdminAccessService',
                Method: 'revokeTeamAdminAccess',
                TeamId: _teamId.toHexString(),
                UserId: _userId.toHexString(),
            });
            throw new MissingObjectError('User not found');
        }

        if (user.teamIds && user.teamIds.includes(_teamId.toHexString())) {
            let team: TeamSchema = await teamService.findTeam(_teamId, 'ownerId');
            if (!team) {
                logger.LogError('Team not found', {
                    Class: 'TeamAdminAccessService',
                    Method: 'revokeTeamAdminAccess',
                    TeamId: _teamId.toHexString(),
                    UserId: _userId.toHexString(),
                });
            }
            if (team.ownerId === _userId) {
                logger.LogError('Cannot revoke admin access for team owner', {
                    Class: 'TeamAdminAccessService',
                    Method: 'revokeTeamAdminAccess',
                    TeamId: _teamId.toHexString(),
                    UserId: _userId.toHexString(),
                });
                throw new ValidationError('Cannot revoke admin access for team owner');
            }
            if (!user.teamAccessRightIds) user.teamAccessRightIds = {};
            user.teamAccessRightIds[_teamId.toHexString()] = GetAccessRightIdsForTeamUser();
            updatedUser = await UserModel.findOneAndUpdate(
                filter,
                { teamAccessRightIds: user.teamAccessRightIds },
                { new: true }
            ).select('_id teamAccessRightIds');
        } else {
            logger.LogError('User not a team member', {
                Class: 'TeamAdminAccessService',
                Method: 'revokeTeamAdminAccess',
                TeamId: _teamId.toHexString(),
                UserId: _userId.toHexString(),
            });
        }

        const deltas = { _id: _userId, teamAccessRightIds: user.teamAccessRightIds };
        await rabbitMQPublisher.publish(
            _teamId,
            'User',
            correlationId,
            PayloadOperation.UPDATE,
            convertData(UserSchema, deltas)
        );

        return updatedUser;
    }
}

export const teamAdminAccessService = new TeamAdminAccessService();
