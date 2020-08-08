import { convertData } from '../utils/ResponseConverters';
import { UserSchema, UserModel } from '../domain/User';
import * as mongodb from 'mongodb';
import * as bcrypt from 'bcrypt';
import { KikiUtils } from '../../shared/KikiUtils';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as moment from 'moment';
import * as _ from 'lodash';


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


  public async findAllUsersInOrg(_orgId: mongodb.ObjectId, responseFields?: string) {
    const filter = { orgIds: { $elemMatch: { $eq: _orgId.toHexString() } } };
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
      userModel.emailConfirmCode = KikiUtils.makeNumericId();
      userModel.emailConfirmCodeExpiration = moment(new Date()).add(5, 'm').toDate().toISOString();
      userModel.hasAcceptedTerms = false;
      userModel = await userModel.save();
    } else {
      userModel = new UserModel(data);
      userModel.emailConfirmCode = KikiUtils.makeNumericId();
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


  public async updateUser(id: mongodb.ObjectId, data: any, responseFields?: string): Promise<object> {
    const filter = { _id: id };

    let updatedUser: any;
    const user: UserSchema = await this.findUser(id);

    if (!user.emailConfirmed)
      throw new ValidationError('Email address not verified');

    if (!user.hasAcceptedTerms)
      throw new ValidationError('User has not accepted terms');

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);

      updatedUser = await UserModel.findOneAndUpdate(filter, { passwordHash: passwordHash }, { new: true }).select(responseFields);
    }

    /// TODO: if org removed, make sure there is an org owner
    if (data.orgIds) {
      updatedUser = await UserModel.findOneAndUpdate(filter, { orgIds: data.orgIds }, { new: true }).select(responseFields);
    }

    // if (data.orgIdsInvited) {
    //   updatedUser = await UserModel.findOneAndUpdate(filter, { orgIdsInvited: data.orgIdsInvited }, { new: true }).select(responseFields);
    // }

    if (data.orgIdsInactive) {
      updatedUser = await UserModel.findOneAndUpdate(filter, { orgIdsInactive: data.orgIdsInactive }, { new: true }).select(responseFields);
    }

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findUser(updatedUser._id, responseFields);
    }
    else {
      return updatedUser; // fully populated model
    }
  }


  public async joinOrg(id: mongodb.ObjectId, _orgId: string): Promise<object> {
    const userModel: any = await userService.findUser(id);
    if (!userModel)
      throw new ValidationError('Something went wrong. Please request a new invite from the team administrator.');

    /// Check if the user is already in the org
    let userAlreadyInOrg: boolean = true;
    if (userModel.orgIds.indexOf(_orgId) < 0)
      userAlreadyInOrg = false;

    /// If the user is already in the org make sure the org is not in the orgIdsInvited or orgIdsInactive lists
    if (userAlreadyInOrg) {
      if (_orgId in userModel.orgIdsInvited) {
        let newOrgIdsInvited: any[] = [];
        for (let i = 0; i < userModel.orgIdsInvited.length; i++) {
          if (userModel.orgIdsInvited[i]._orgId != _orgId) {
            newOrgIdsInvited.push(userModel.orgIdsInvited[i]);
          }
        }
        userModel.orgIdsInvited = newOrgIdsInvited;
        if (userModel.orgIdsInactive.indexOf(_orgId) >= 0)
          userModel.orgIdsInactive = KikiUtils.removeItemFromArray(userModel.orgIdsInactive, _orgId);
        await userModel.save();
      }
      return;
    }

    let userInvitedToOrg: boolean = false;
    const filterRes = _.filter(userModel.orgIdsInvited, o => o._orgId == _orgId);
    if (_.isArray(filterRes) && filterRes.length > 0)
      userInvitedToOrg = true;

    if (!userInvitedToOrg)
      throw new ValidationError('Not invited to requested team');

    if (userModel.orgIdsInactive.indexOf(_orgId) >= 0)
      userModel.orgIdsInactive = KikiUtils.removeItemFromArray(userModel.orgIdsInactive, _orgId);

    userModel.orgIds.push(_orgId);
    let newOrgIdsInvited: any[] = [];
    for (let i = 0; i < userModel.orgIdsInvited.length; i++) {
      if (userModel.orgIdsInvited[i]._orgId != _orgId) {
        newOrgIdsInvited.push(userModel.orgIdsInvited[i]);
      }
    }
    userModel.orgIdsInvited = newOrgIdsInvited;

    await userModel.save();

    return userModel;
  }
}

export const userService = new UserService();