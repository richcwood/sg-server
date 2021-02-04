import { convertData } from '../utils/ResponseConverters';
import { UserSchema, UserModel } from '../domain/User';
import * as mongodb from 'mongodb';
import * as bcrypt from 'bcrypt';
import { SGUtils } from '../../shared/SGUtils';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as moment from 'moment';
import * as _ from 'lodash';
import { BaseLogger } from '../../shared/SGLogger';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { GetAccessRightIdsForTeamUser } from '../../api/utils/Shared';



export class UserService {

  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllUsersInternal(filter?: any, responseFields?: string) {
    return UserModel.find(filter).select(responseFields);
  }


  public async findUser(_userId: mongodb.ObjectId, responseFields?: string) {
    let user = await UserModel.findById(_userId).select(responseFields);
    return user;
  }


  public async findUserByEmail(email: string, responseFields?: string) {
    let user = await UserModel.find({ email }).select(responseFields);
    return user;
  }


  public async findAllUsersInTeam(_teamId: mongodb.ObjectId, responseFields?: string) {
    const filter = { teamIds: { $elemMatch: { $eq: _teamId.toHexString() } } };
    return await UserModel.find(filter).select(responseFields);
  }


  public async createUserInternal(data: any): Promise<object> {
    const model = new UserModel(data);
    await model.save();
    return;
  }


  public async createUser(data: any, responseFields?: string): Promise<object> {
    if (!data.email)
      throw new ValidationError(`Request body missing "email" parameter`);

    let userModel: any = undefined;

    const queryRes: any = await userService.findAllUsersInternal({ email: data.email })
    if (_.isArray(queryRes) && queryRes.length > 0) {
      userModel = queryRes[0];
      userModel.emailConfirmCode = SGUtils.makeNumericId();
      userModel.emailConfirmCodeExpiration = moment(new Date()).add(5, 'm').toDate().toISOString();
      userModel.hasAcceptedTerms = false;
      userModel = await userModel.save();
    } else {
      userModel = new UserModel(data);
      userModel.emailConfirmCode = SGUtils.makeNumericId();
      userModel.emailConfirmCodeExpiration = moment(new Date()).add(5, 'm').toDate().toISOString();
      userModel.hasAcceptedTerms = false;
      userModel = await userModel.save();
    }

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findUser(userModel._id, responseFields);
    }
    else {
      return userModel; // fully populated model
    }
  }


  // public async updateUser(id: mongodb.ObjectId, data: any, responseFields?: string): Promise<object> {
  //   const filter = { _id: id };

  //   const updatedUser = await UserModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

  //   return convertData(UserSchema, updatedUser);
  // }


  public async updateUserInternal(id: mongodb.ObjectId, data: any, logger: BaseLogger, responseFields?: string): Promise<object> {
    const filter = { _id: id };

    let updatedUser: any;
    const user: UserSchema = await this.findUser(id);

    if (!user.emailConfirmed)
      throw new ValidationError('Email address not verified');

    if (!user.hasAcceptedTerms)
      throw new ValidationError('User has not accepted terms');

    // if (data.password) {
    //   const salt = await bcrypt.genSalt(10);
    //   const passwordHash = await bcrypt.hash(data.password, salt);

    //   updatedUser = await UserModel.findOneAndUpdate(filter, { passwordHash: passwordHash }, { new: true }).select(responseFields);
    // }

    if (data.teamIds) {
      updatedUser = await UserModel.findOneAndUpdate(filter, { teamIds: data.teamIds }, { new: true }).select(responseFields);
    }

    if (data.teamIdsInvited) {
      updatedUser = await UserModel.findOneAndUpdate(filter, { teamIdsInvited: data.teamIdsInvited }, { new: true }).select(responseFields);
    }

    if (data.teamAccessRightIds) {
      updatedUser = await UserModel.findOneAndUpdate(filter, { teamAccessRightIds: data.teamAccessRightIds }, { new: true }).select(responseFields);
    }

    if (data.teamIdsInactive) {
      updatedUser = await UserModel.findOneAndUpdate(filter, { teamIdsInactive: data.teamIdsInactive }, { new: true }).select(responseFields);
    }

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findUser(updatedUser._id, responseFields);
    }
    else {
      return updatedUser; // fully populated model
    }
  }


  /// TODO: if team removed, make sure there is a team owner
  public async leaveTeam(id: mongodb.ObjectId, removedById: mongodb.ObjectId, _teamId: string, logger: BaseLogger, correlationId?: string): Promise<object> {
    const filter = { _id: id };

    const userModel: any = await userService.findUser(id);
    if (!userModel)
      throw new MissingObjectError('User not found');

    if (!_teamId)
      throw new ValidationError('Missing header _teamId');

    if (!userModel.teamIds)
      return userModel;

    /// Check if the user is in the team
    if (userModel.teamIds.indexOf(_teamId) < 0) {
      logger.LogError('User is not a member of the team', { Class: 'UserService', Method: 'leaveTeam', TeamId: _teamId, id: id.toHexString() });
      throw new ValidationError('User is not a member of the team');
    }

    let newTeamIds = [];
    let newTeamIdsInactive = [];
    for (let i = 0; i < userModel.teamIds.length; i++) {
      if (userModel.teamIds[i] != _teamId)
        newTeamIds.push(userModel.teamIds[i]);
      else
        newTeamIdsInactive.push(userModel.teamIds[i]);
    }

    let newTeamAccessRightIds: {[_teamId: string] : number[]} = {};
    for (let i = 0; i < Object.keys(userModel.teamAccessRightIds).length; i++) {
      const key = Object.keys(userModel.teamAccessRightIds)[i];
      if (key != _teamId) {
        newTeamAccessRightIds[key] = userModel.teamAccessRightIds[key];
      }
    }

    const updatedUser = await UserModel.findOneAndUpdate(filter, { teamIds: newTeamIds, teamIdsInactive: newTeamIdsInactive, teamAccessRightIds: newTeamAccessRightIds }, { new: true }).select('_id teamIds teamIdsInactive');

    logger.LogWarning('User removed from team', { Class: 'UserService', Method: 'leaveTeam', TeamId: _teamId, id: id.toHexString(), RemovedBy: removedById.toHexString() });

    const deltas = { _id: id, teamIds: updatedUser.teamIds, teamIdsInactive: updatedUser.teamIdsInactive };
    await rabbitMQPublisher.publish(_teamId, "User", correlationId, PayloadOperation.UPDATE, convertData(UserSchema, deltas));

    return updatedUser;
  }


  public async joinTeam(id: mongodb.ObjectId, _teamId: string): Promise<object> {
    const userModel: any = await userService.findUser(id);
    if (!userModel)
      throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');

    /// Check if the user is already in the team
    let userAlreadyInTeam: boolean = true;
    if (userModel.teamIds.indexOf(_teamId) < 0)
      userAlreadyInTeam = false;

    /// If the user is already in the team make sure the team is not in the teamIdsInvited or teamIdsInactive lists
    if (userAlreadyInTeam) {
      if (_teamId in userModel.teamIdsInvited) {
        let newTeamIdsInvited: any[] = [];
        for (let i = 0; i < userModel.teamIdsInvited.length; i++) {
          if (userModel.teamIdsInvited[i]._teamId != _teamId) {
            newTeamIdsInvited.push(userModel.teamIdsInvited[i]);
          }
        }
        userModel.teamIdsInvited = newTeamIdsInvited;
        if (userModel.teamIdsInactive.indexOf(_teamId) >= 0)
          userModel.teamIdsInactive = SGUtils.removeItemFromArray(userModel.teamIdsInactive, _teamId);
        await userModel.save();
      }
      return;
    }

    let userInvitedToTeam: boolean = false;
    const filterRes = _.filter(userModel.teamIdsInvited, o => o._teamId == _teamId);
    if (_.isArray(filterRes) && filterRes.length > 0)
      userInvitedToTeam = true;

    if (!userInvitedToTeam)
      throw new ValidationError('Not invited to requested team');

    if (userModel.teamIdsInactive.indexOf(_teamId) >= 0)
      userModel.teamIdsInactive = SGUtils.removeItemFromArray(userModel.teamIdsInactive, _teamId);

    userModel.teamIds.push(_teamId);
    let newTeamIdsInvited: any[] = [];
    for (let i = 0; i < userModel.teamIdsInvited.length; i++) {
      if (userModel.teamIdsInvited[i]._teamId != _teamId) {
        newTeamIdsInvited.push(userModel.teamIdsInvited[i]);
      }
    }
    userModel.teamIdsInvited = newTeamIdsInvited;

    let newTeamAccessRightIds: {[_teamId: string] : number[]} = {};
    newTeamAccessRightIds[_teamId] = GetAccessRightIdsForTeamUser();
    for (let i = 0; i < Object.keys(userModel.teamAccessRightIds).length; i++) {
      const key = Object.keys(userModel.teamAccessRightIds)[i];
      if (key != _teamId) {
        newTeamAccessRightIds[key] = userModel.teamAccessRightIds[key];
      }
    }
    userModel.teamAccessRightIds = newTeamAccessRightIds;

    await userModel.save();

    return userModel;
  }
}

export const userService = new UserService();