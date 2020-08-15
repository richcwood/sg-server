import { convertData } from '../utils/ResponseConverters';
import { StepSchema, StepModel } from '../domain/Step';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';


export class StepService {

    // Some services might need to add additional restrictions to bulk queries
    // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
    // public async updateBulkQuery(query): Promise<object> {
    //   // modify query here
    //   return query;
    // }

    public async findAllStepsInternal(filter?: any, responseFields?: string) {
        return StepModel.find(filter).select(responseFields);
    }


    public async findAllTaskSteps(_teamId: mongodb.ObjectId, _taskId: mongodb.ObjectId, responseFields?: string) {
        return StepModel.find({ _teamId, _taskId }).select(responseFields);
    }


    public async findStep(_teamId: mongodb.ObjectId, stepId: mongodb.ObjectId, responseFields?: string) {
        return StepModel.findById(stepId).find({ _teamId }).select(responseFields);
    }


    public async createStepInternal(data: any): Promise<object> {
        const model = new StepModel(data);
        await model.save();
        return;
    }


    public async createStep(_teamId: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        data._teamId = _teamId;
        const stepModel = new StepModel(data);
        const newStep = await stepModel.save();

        await rabbitMQPublisher.publish(_teamId, "Step", correlationId, PayloadOperation.CREATE, convertData(StepSchema, newStep));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findStep(_teamId, newStep._id, responseFields);
        }
        else {
            return newStep; // fully populated model
        }
    }


    public async updateStep(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId };
        const updatedStep = await StepModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedStep)
            throw new MissingObjectError(`Step '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "Step", correlationId, PayloadOperation.UPDATE, convertData(StepSchema, deltas));

        return updatedStep; // fully populated model
    }


}

export const stepService = new StepService();