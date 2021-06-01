import { convertData } from '../utils/ResponseConverters';
import { TeamModel, TeamSchema } from '../domain/Team';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { RabbitMQAdmin } from '../../shared/RabbitMQAdmin';
import { BaseLogger } from '../../shared/SGLogger';
import { SGStrings } from '../../shared/SGStrings';
import { SGUtils } from '../../shared/SGUtils';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { stripeClientTokenService } from '../services/StripeClientTokenService';
import * as mongodb from 'mongodb';
import * as config from 'config';
import * as _ from 'lodash';
const jwt = require('jsonwebtoken');


export class TeamService {

  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllTeamsInternal(filter?: any, responseFields?: string) {
    return TeamModel.find(filter).select(responseFields);
  }


  public async findTeam(teamId: mongodb.ObjectId, responseFields?: string) {
    return TeamModel.findById(teamId).select(responseFields);
  }


  public async createTeamInternal(data: any): Promise<object> {
    const model = new TeamModel(data);
    await model.save();
    return;
  }


  public async createUnassignedTeam(data: any, logger: BaseLogger, responseFields?: string): Promise<object> {
    let newTeam: TeamSchema;
    data.userAssigned = false;
    const teamModel = new TeamModel(data);
    newTeam = await teamModel.save();
    
    if (responseFields) {
      return this.findTeam(newTeam.id, responseFields);
    }
    else {
      return newTeam; // fully populated model
    }
  }


  public async createTeam(data: any, logger: BaseLogger, responseFields?: string): Promise<object> {
    if (!data.name)
      throw new ValidationError(`Request body missing "name" parameter`);

    let newTeam: TeamSchema;
    /// Check if we already have an team with this name
    const existingTeamQuery: any = await this.findAllTeamsInternal({ name: data.name });
    if (_.isArray(existingTeamQuery) && existingTeamQuery.length > 0) {
      newTeam = existingTeamQuery[0];
      if (newTeam.ownerId.toHexString() != data.ownerId.toHexString())
        throw new ValidationError(`Team with name "${data.name}" already exists`);
    } else {
      data.userAssigned = true;
      data.activationDate = new Date().getTime();
      // const unassignedTeamQuery: any = await this.findAllTeamsInternal({ userAssigned: false });
      newTeam = await TeamModel.findOneAndUpdate({ userAssigned: false }, data, { new: true });
      // const unassignedTeamQuery: any = await TeamModel.find({ userAssigned: false }).limit(1)
      if (!newTeam) {
        const teamModel = new TeamModel(data);
        newTeam = await teamModel.save();
      }

      let dataUpdates: any = {};
      /// Create company in stripe for billing
      let res: any = await stripeClientTokenService.createStripeCustomer(newTeam);
      if (!res.success) {
        logger.LogError(`Error creating stripe customer`, {error: res.err});
      } else {
        logger.LogDebug(`Created stripe customer`, {customer: res.customer});
        dataUpdates.stripe_id = res.customer.id;
      }

      /// Create general team invite link
      const secret = config.get('secret');
      const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24 * 180); // 180 days
      let token = jwt.sign({
        InvitedTeamId: newTeam._id,
        InvitedTeamName: newTeam.name,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

      let url = config.get('WEB_CONSOLE_BASE_URL');
      const port = config.get('WEB_CONSOLE_PORT');

      if (port != '')
        url += `:${port}`
      let joinTeamLink = `${url}/?invitedTeamToken=${token}`;

      dataUpdates.inviteLink = joinTeamLink;
      dataUpdates.isActive = true;
      dataUpdates.rmqPassword = SGUtils.makeid(10);

      const filter = { _id: newTeam._id };
      newTeam = await TeamModel.findOneAndUpdate(filter, dataUpdates, { new: true });
    }


    /// Create rabbitmq artifacts for this team
    const rmqAdminUrl = config.get('rmqAdminUrl');

    let rmqVhost = config.get('rmqVhost');
    const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost, logger);
    const newUsername = newTeam._id.toString();

    const teamExchange = SGStrings.GetTeamRoutingPrefix(newTeam._id);
    await rmqAdmin.createExchange(teamExchange, 'topic', false, true);
    await rmqAdmin.createUser(newUsername, newTeam.rmqPassword, teamExchange);

    if (responseFields) {
      return this.findTeam(newTeam.id, responseFields);
    }
    else {
      return newTeam; // fully populated model
    }
  }


  public async updateTeam(id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
    const filter = { _id: id };

    const updatedTeam = await TeamModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

    if (!updatedTeam)
      throw new MissingObjectError(`Team with id '${id}' not found.`)

    const deltas = Object.assign({ _id: id }, data);
    await rabbitMQPublisher.publish(id, "Team", correlationId, PayloadOperation.UPDATE, convertData(TeamSchema, deltas));

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findTeam(updatedTeam._id, responseFields);
    }
    else {
      return updatedTeam; // fully populated model
    }
  }
}

export const teamService = new TeamService();