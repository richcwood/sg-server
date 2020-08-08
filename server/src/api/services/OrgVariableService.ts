import { convertData } from '../utils/ResponseConverters';
import { OrgVariableSchema, OrgVariableModel } from '../domain/OrgVariable';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class OrgVariableService {

    public async findAllOrgVariablesInternal(filter?: any, responseFields?: string) {
        return OrgVariableModel.find(filter).select(responseFields);
    }


    public async findAllOrgVariables(_orgId: mongodb.ObjectId, responseFields?: string) {
        return OrgVariableModel.find({ _orgId }).select(responseFields);
    }


    public async findOrgVariable(_orgId: mongodb.ObjectId, orgVariableId: mongodb.ObjectId, responseFields?: string) {
        return OrgVariableModel.findById(orgVariableId).find({ _orgId }).select(responseFields);
    }


    public async findOrgVariableByName(_orgId: mongodb.ObjectId, name: string, responseFields?: string) {
        return OrgVariableModel.find({ _orgId, name }).select(responseFields);
    }


    public async createOrgVariableInternal(data: any): Promise<object> {
        const model = new OrgVariableModel(data);
        await model.save();
        return;
    }


    public async createOrgVariable(_orgId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        if (!data.name)
            throw new ValidationError(`Request body missing "name" parameter`);
        if (!data.value)
            throw new ValidationError(`Request body missing "value" parameter`);


        let orgVars: OrgVariableSchema[] = await this.findOrgVariableByName(_orgId, data.name, 'value');
        if (_.isArray(orgVars) && orgVars.length > 0) {
            if (orgVars[0].value != data.value) {
                throw new ValidationError(`Value with name "${data.name}" already exists`);
            }else {
                return orgVars;
            }
        }

        data._orgId = _orgId;
        const orgVariableModel = new OrgVariableModel(data);
        const newOrgVariable = await orgVariableModel.save();

        await rabbitMQPublisher.publish(_orgId, "OrgVariable", correlationId, PayloadOperation.CREATE, convertData(OrgVariableSchema, newOrgVariable));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findOrgVariable(_orgId, newOrgVariable.id, responseFields);
        }
        else {
            return newOrgVariable; // fully populated model
        }
    }


    public async updateOrgVariable(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _orgId };
        const updatedOrgVariable = await OrgVariableModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedOrgVariable)
            throw new MissingObjectError(`OrgVariable '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_orgId, "OrgVariable", correlationId, PayloadOperation.UPDATE, convertData(OrgVariableSchema, deltas));

        return updatedOrgVariable; // fully populated model
    }


    public async deleteOrgVariable(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId: string): Promise<object> {
        const deleted = await OrgVariableModel.deleteOne({ _id: id, _orgId });

        await rabbitMQPublisher.publish(_orgId, "OrgVariable", correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }
}

export const orgVariableService = new OrgVariableService();