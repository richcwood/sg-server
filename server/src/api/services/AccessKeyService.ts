import { convertData } from '../utils/ResponseConverters';
import { AccessKeySchema, AccessKeyModel } from '../domain/AccessKey';
import { accessRightService } from '../services/AccessRightService';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { AccessKeyType, UserRole } from '../../shared/Enums';
import * as mongodb from 'mongodb';
import { BaseLogger } from '../../shared/SGLogger';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import { SGUtils } from '../../shared/SGUtils';


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


    public async createAccessKeyInternal(data: any): Promise<object> {
        const model = new AccessKeyModel(data);
        await model.save();
        return { success: true };
    }


    private async checkUserAccessRights(requestedAccessRightIds: number[], logger: BaseLogger) {
        const accessRightsQuery = await accessRightService.findAllAccessRightsInternal({groupId: UserRole.ADMINISTRATOR}, 'rightId');

        let accessRightIdsToExclude: number[] = [];
        if (!accessRightsQuery || (_.isArray(accessRightsQuery) && accessRightsQuery.length === 0)) {
            logger.LogError('No rights found for ADMINISTRATOR UserRole', {});
            accessRightIdsToExclude = [83,82,81,80,79,75,74,70,6863,61,57,55,50,41,37,35,32,27,19,17,10,7,6,5,4,3,2,1];
        } else {
            for (let i = 0; i < accessRightsQuery.length; i++) {
                accessRightIdsToExclude.push(accessRightsQuery[i].rightId);
            }
            accessRightIdsToExclude.push(1);
            accessRightIdsToExclude.push(3);
            accessRightIdsToExclude.push(6);
            accessRightIdsToExclude.push(7);
        }

        let accessRightIds: number[] = [];
        for (let i = 0; i < requestedAccessRightIds.length; i++) {
            if (accessRightIdsToExclude.includes(requestedAccessRightIds[i]))
                continue;
            accessRightIds.push(requestedAccessRightIds[i]);
        }

        return accessRightIds;
    }


    public async createAccessKey(_teamId: mongodb.ObjectId, data: any, logger: BaseLogger, correlationId: string, responseFields?: string): Promise<object> {
        if (!data.hasOwnProperty("accessKeyType"))
            throw new ValidationError(`Missing required field "accessKeyType"`);
        if (!data.description)
            throw new ValidationError(`Missing required field "description"`);
        if (!data.accessRightIds && data.accessKeyType != AccessKeyType.AGENT)
            throw new ValidationError(`Missing required field "accessRightIds"`);
        if (data.accessRightIds && data.accessKeyType == AccessKeyType.AGENT)
            throw new ValidationError(`Cannot set "accessRightIds" for Agent access keys`);

        let accessRightIds: number[] = [];
        if (data.accessKeyType == AccessKeyType.AGENT) {
            const accessRightsQuery = await accessRightService.findAllAccessRightsInternal({groupId: UserRole.AGENT}, 'rightId');
            if (!accessRightsQuery || (_.isArray(accessRightsQuery) && accessRightsQuery.length === 0)) {
                logger.LogError('No rights found for AGENT UserRole', {});
                accessRightIds = [72,69,59,56,12,7,6,3];
            } else {
                for (let i = 0; i < accessRightsQuery.length; i++) {
                    accessRightIds.push(accessRightsQuery[i].rightId);
                }
            }
            data.accessRightIds = accessRightIds;
        } else {
            data.accessRightIds = await this.checkUserAccessRights(data.accessRightIds, logger);
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


    public async updateAccessKey(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, logger: BaseLogger, correlationId: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId };

        const existingAccessKeyQuery = await this.findAllAccessKeysInternal(filter);
        if (_.isArray(existingAccessKeyQuery) && existingAccessKeyQuery.length > 0) {
            const existingAccessKey: AccessKeySchema = existingAccessKeyQuery[0];

            if (data.accessKeyId && data.accessKeyId != existingAccessKey.accessKeyId)
                throw new ValidationError('Cannot modify Access Key ID');
            if (data.accessKeySecret && data.accessKeySecret != existingAccessKey.accessKeySecret)
                throw new ValidationError('Cannot modify Access Key Secret');
            if (data.accessKeyType && data.accessKeyType != existingAccessKey.accessKeyType)
                throw new ValidationError('Cannot modify Access Key Type');
            if (data.accessRightIds && existingAccessKey.accessKeyType == AccessKeyType.AGENT && data.accessRightIds.sort().join() != existingAccessKey.accessRightIds.sort().join())
                throw new ValidationError('Cannot modify Agent Access Rights');
        }

        if (data.accessRightIds && data.accessKeyType != AccessKeyType.AGENT)
            data.accessRightIds = await this.checkUserAccessRights(data.accessRightIds, logger);

        const updatedAccessKey = await AccessKeyModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedAccessKey)
            throw new MissingObjectError(`Access Key '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "AccessKey", correlationId, PayloadOperation.UPDATE, convertData(AccessKeySchema, deltas));

        return updatedAccessKey; // fully populated model
    }


    public async deleteAccessKey(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId: string): Promise<object> {
        const deleted = await AccessKeyModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, "AccessKey", correlationId, PayloadOperation.DELETE, { id: id });

        return deleted;
    }
}

export const accessKeyService = new AccessKeyService();