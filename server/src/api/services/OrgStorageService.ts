import { convertData } from '../utils/ResponseConverters';
import { OrgStorageSchema, OrgStorageModel } from '../domain/OrgStorage';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import * as moment from 'moment';


export class OrgStorageService {

    public async findAllOrgStoragesInternal(filter?: any, responseFields?: string) {
        return OrgStorageModel.find(filter).select(responseFields);
    }


    public async findAllOrgStorages(_orgId: mongodb.ObjectId, responseFields?: string) {
        return OrgStorageModel.find({ _orgId }).select(responseFields);
    }


    public async findOrgStorage(_orgId: mongodb.ObjectId, orgStorageId: mongodb.ObjectId, responseFields?: string) {
        return OrgStorageModel.findById(orgStorageId).find({ _orgId }).select(responseFields);
    }


    public async createOrgStorageInternal(data: any): Promise<object> {
        const model = new OrgStorageModel(data);
        await model.save();
        return;
    }


    public async createOrgStorage(_orgId: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        if (!data.date)
            throw new MissingObjectError('Missing date');

        const date = moment.utc(data.date);
        if (!date.isValid())
            throw new ValidationError('Invalid date');
        data.date = date.toDate().toISOString();

        data._orgId = _orgId;
        const orgStorageModel = new OrgStorageModel(data);
        const newOrgStorage = await orgStorageModel.save();

        // await rabbitMQPublisher.publish(_orgId, "OrgStorage", correlationId, PayloadOperation.CREATE, convertData(OrgStorageSchema, newOrgStorage));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findOrgStorage(_orgId, newOrgStorage.id, responseFields);
        }
        else {
            return newOrgStorage; // fully populated model
        }
    }


    public async updateOrgStorage(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _orgId };
        data = Object.assign(data, { $inc: { 'numobservations': 1 } });
        const updatedOrgStorage = await OrgStorageModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedOrgStorage)
            throw new MissingObjectError(`OrgStorage '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        // const deltas = Object.assign({ _id: id }, data);
        // await rabbitMQPublisher.publish(_orgId, "OrgStorage", correlationId, PayloadOperation.UPDATE, convertData(OrgStorageSchema, deltas));

        return updatedOrgStorage; // fully populated model
    }
}

export const orgStorageService = new OrgStorageService();