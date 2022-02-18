import { convertData } from '../utils/ResponseConverters';
import { AccessKeySchema, AccessKeyModel } from '../domain/AccessKey';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { AccessKeyType } from '../../shared/Enums';
import * as mongodb from 'mongodb';
import { BaseLogger } from '../../shared/SGLogger';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import { SGUtils } from '../../shared/SGUtils';
import { GetAccessRightIdsForSGAgent, GetGlobalAccessRightId } from '../../api/utils/Shared';
import BitSet from 'bitset';


export class AccessKeyService {

    // Some services might need to add additional restrictions to bulk queries
    // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
    // public async updateBulkQuery(query): Promise<object> {
    //   // modify query here
    //   return query;
    // }

    public async findAllAccessKeysInternal(filter?: any, responseFields?: string) {
        return AccessKeyModel.find(filter).select(responseFields);
    }


    public async findAllAccessKeys(_teamId: mongodb.ObjectId, responseFields?: string) {
        return AccessKeyModel.find({ _teamId }).select(responseFields);
    }


    public async findAccessKey(_teamId: mongodb.ObjectId, accessKeyId: mongodb.ObjectId, responseFields?: string) {
        return AccessKeyModel.findById(accessKeyId).find({ _teamId }).select(responseFields);
    }


    public async createAccessKeyInternal(data): Promise<object> {
        if (!data.accessKeyId)
            data.accessKeyId = SGUtils.makeid(20, false).toUpperCase();
        if (!data.accessKeySecret)
            data.accessKeySecret = crypto.randomBytes(20).toString('hex');

        const accessKeyModel = new AccessKeyModel(data);
        const newAccessKey = await accessKeyModel.save();

        return newAccessKey; // fully populated model
    }


    public async createAccessKey(_teamId: mongodb.ObjectId, teamAccessRightIds: string[], data: any, correlationId: string, responseFields?: string): Promise<object> {
        if (!data.hasOwnProperty("accessKeyType"))
            throw new ValidationError(`Missing required field "accessKeyType"`);
        if (!data.hasOwnProperty("description"))
            throw new ValidationError(`Missing required field "description"`);
        if (!data.accessRightIds && data.accessKeyType != AccessKeyType.AGENT)
            throw new ValidationError(`Missing required field "accessRightIds"`);
        if (data.accessRightIds && data.accessKeyType == AccessKeyType.AGENT)
            throw new ValidationError(`Cannot set "accessRightIds" for Agent access keys`);
        
        const teamIdAsString: string = _teamId.toHexString();

        if (data.accessKeyType == AccessKeyType.AGENT) {
            data.accessRightIds = GetAccessRightIdsForSGAgent();
        } else {
            if (!_.isArray(data.accessRightIds) || data.accessRightIds.length < 1)
                throw new ValidationError('Invalid access right ids parameter');
            if (teamAccessRightIds && teamAccessRightIds[teamIdAsString]) {
                const allowedRightsBitset = BitSet.fromHexString(teamAccessRightIds[teamIdAsString]);
                if (allowedRightsBitset.get(GetGlobalAccessRightId()) !== 1) {
                    const requestedRightsBitset = new BitSet();
                    for (let i = 0; i < data.accessRightIds.length; i++)
                        requestedRightsBitset.set(data.accessRightIds[i], 1);

                    if (!allowedRightsBitset.or(requestedRightsBitset).equals(allowedRightsBitset))
                        throw new ValidationError('Access to requested rights denied');
                }
            } else if (teamAccessRightIds && teamAccessRightIds['default']) {
                const allowedRightsBitset = BitSet.fromHexString(teamAccessRightIds['default']);
                if (allowedRightsBitset.get(GetGlobalAccessRightId()) !== 1) {
                    const requestedRightsBitset = new BitSet();
                    for (let i = 0; i < data.accessRightIds.length; i++)
                        requestedRightsBitset.set(data.accessRightIds[i], 1);

                    if (!allowedRightsBitset.or(requestedRightsBitset).equals(allowedRightsBitset))
                        throw new ValidationError('Access to requested rights denied');
                }
            } else {
                throw new ValidationError('No access rights for the requested team');
            }
        }

        data.accessKeyId = SGUtils.makeid(20, false).toUpperCase();
        data.accessKeySecret = crypto.randomBytes(20).toString('hex');

        data._teamId = _teamId;
        const accessKeyModel = new AccessKeyModel(data);
        const newAccessKey = await accessKeyModel.save();

        await rabbitMQPublisher.publish(_teamId, "AccessKey", correlationId, PayloadOperation.CREATE, convertData(AccessKeySchema, newAccessKey));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findAccessKey(_teamId, newAccessKey._id, responseFields);
        }
        else {
            return newAccessKey; // fully populated model
        }
    }


    public async updateAccessKey(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId };

        if (data.hasOwnProperty('createdBy'))
            throw new ValidationError('Cannot modify access key');
        if (data.hasOwnProperty('accessKeyId'))
            throw new ValidationError('Cannot modify access key');
        if (data.hasOwnProperty('accessKeySecret'))
            throw new ValidationError('Cannot modify access key');
        if (data.hasOwnProperty('accessKeyType'))
            throw new ValidationError('Cannot modify access key');
        if (data.hasOwnProperty('description'))
            throw new ValidationError('Cannot modify access key');
        if (data.hasOwnProperty('expiration'))
            throw new ValidationError('Cannot modify access key');
        if (data.hasOwnProperty('accessRightIds'))
            throw new ValidationError('Cannot modify access key');

        const updatedAccessKey = await AccessKeyModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedAccessKey)
            throw new MissingObjectError(`Access Key not found with filter "${JSON.stringify(filter, null, 4)}".`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "AccessKey", correlationId, PayloadOperation.UPDATE, convertData(AccessKeySchema, deltas));

        delete updatedAccessKey.accessKeySecret;
        return updatedAccessKey; // fully populated model
    }


    public async deleteAccessKey(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId: string): Promise<object> {
        const deleted = await AccessKeyModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, "AccessKey", correlationId, PayloadOperation.DELETE, { id: id });

        return deleted;
    }
}

export const accessKeyService = new AccessKeyService();