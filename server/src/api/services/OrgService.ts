import { convertData } from '../utils/ResponseConverters';
import { OrgModel, OrgSchema } from '../domain/Org';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { RabbitMQAdmin } from '../../shared/RabbitMQAdmin';
import { BaseLogger } from '../../shared/SGLogger';
import { SGStrings } from '../../shared/SGStrings';
import { SGUtils } from '../../shared/SGUtils';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import * as mongodb from 'mongodb';
import * as config from 'config';
import * as _ from 'lodash';
const jwt = require('jsonwebtoken');


export class OrgService {

  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllOrgsInternal(filter?: any, responseFields?: string) {
    return OrgModel.find(filter).select(responseFields);
  }


  public async findOrg(orgId: mongodb.ObjectId, responseFields?: string) {
    return OrgModel.findById(orgId).select(responseFields);
  }


  public async createOrgInternal(data: any): Promise<object> {
    const model = new OrgModel(data);
    await model.save();
    return;
  }


  public async createOrg(data: any, logger: BaseLogger, responseFields?: string): Promise<object> {
    if (!data.name)
      throw new ValidationError(`Request body missing "name" parameter`);

    let newOrg: OrgSchema;
    /// Check if we already have an org with this name
    const existingOrgQuery: any = await this.findAllOrgsInternal({ name: data.name });
    if (_.isArray(existingOrgQuery) && existingOrgQuery.length > 0) {
      newOrg = existingOrgQuery[0];
      if (newOrg.ownerId.toHexString() != data.ownerId.toHexString())
        throw new ValidationError(`Org with name "${data.name}" already exists`);
    } else {
      const orgModel = new OrgModel(data);

      /// Create general org invite link
      const secret = config.get('secret');
      const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24 * 180); // 180 days
      let token = jwt.sign({
        InvitedOrgId: orgModel._id,
        InvitedOrgName: orgModel.name,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

      let url = config.get('WEB_CONSOLE_BASE_URL');
      const port = config.get('WEB_CONSOLE_PORT');

      if (port != '')
        url += `:${port}`
      let joinOrgLink = `${url}/?invitedOrgToken_shared=${token}`;

      orgModel.inviteLink = joinOrgLink;

      orgModel.rmqPassword = SGUtils.makeid(10);

      newOrg = await orgModel.save();
    }


    /// Create rabbitmq artifacts for this org
    const rmqAdminUrl = config.get('rmqAdminUrl');

    let rmqVhost = config.get('rmqVhost');
    const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost, logger);
    const newUsername = newOrg._id.toString();

    const orgExchange = SGStrings.GetOrgRoutingPrefix(newOrg._id);
    await rmqAdmin.createExchange(orgExchange, 'topic', false, true);
    await rmqAdmin.createUser(newUsername, newOrg.rmqPassword, orgExchange);

    // let createAgentStubData = {
    //   name: `BuildAgentStub - ${newOrg.id.toHexString()} - ${platform}${arch} - ${agentStubVersion}`,
    //   runtimeVars: {
    //     orgId: _orgId,
    //     agentVersion: agentStubVersion,
    //     platform: platform,
    //     arch: arch,
    //     secret: config.get("secret")
    //   }
    // };
    // await localRestAccess.RestAPICall('job', 'POST', config.get("sgOrg"), {_jobDefId: config.get('buildAgentStubJobDefId')}, data);


    if (responseFields) {
      return this.findOrg(newOrg.id, responseFields);
    }
    else {
      return newOrg; // fully populated model
    }
  }


  public async updateOrg(id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
    const filter = { _id: id };

    const updatedOrg = await OrgModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

    if (!updatedOrg)
      throw new MissingObjectError(`Org with id '${id}' not found.`)

    const deltas = Object.assign({ _id: id }, data);
    await rabbitMQPublisher.publish(id, "Org", correlationId, PayloadOperation.UPDATE, convertData(OrgSchema, deltas));

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findOrg(updatedOrg._id, responseFields);
    }
    else {
      return updatedOrg; // fully populated model
    }
  }
}

export const orgService = new OrgService();