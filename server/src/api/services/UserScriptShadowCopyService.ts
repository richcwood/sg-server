import { convertData } from '../utils/ResponseConverters';
import { UserScriptShadowCopySchema, UserScriptShadowCopyModel } from '../domain/UserScriptShadowCopy';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';


export class UserScriptShadowCopyService {

    public async findAllUserScriptShadowCopiesInternal(filter?: any, responseFields?: string) {
        return UserScriptShadowCopyModel.find(filter).select(responseFields);
    }


    public async findAllUserScriptShadowCopies(_teamId: mongodb.ObjectId, responseFields?: string) {
        return UserScriptShadowCopyModel.find({ _teamId }).select(responseFields);
    }


    public async findUserScriptShadowCopy(_teamId: mongodb.ObjectId, userScriptShadowCopyId: mongodb.ObjectId, responseFields?: string) {
        return UserScriptShadowCopyModel.findById(userScriptShadowCopyId).find({ _teamId }).select(responseFields);
    }


    public async createUserScriptShadowCopyInternal(data: any): Promise<object> {
        const model = new UserScriptShadowCopyModel(data);
        await model.save();
        return;
    }


    public async createUserScriptShadowCopy(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        data._teamId = _teamId;
        const userScriptShadowCopyModel = new UserScriptShadowCopyModel(data);
        const newUserScriptShadowCopy = await userScriptShadowCopyModel.save();

        await rabbitMQPublisher.publish(_teamId, "UserScriptShadowCopy", correlationId, PayloadOperation.CREATE, convertData(UserScriptShadowCopySchema, newUserScriptShadowCopy));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findUserScriptShadowCopy(_teamId, newUserScriptShadowCopy.id, responseFields);
        }
        else {
            return newUserScriptShadowCopy; // fully populated model
        }
    }


    public async updateUserScriptShadowCopy(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId };
        const updatedUserScriptShadowCopy = await UserScriptShadowCopyModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedUserScriptShadowCopy)
            throw new MissingObjectError(`UserScriptShadowCopy '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "UserScriptShadowCopy", correlationId, PayloadOperation.UPDATE, convertData(UserScriptShadowCopySchema, deltas));

        return updatedUserScriptShadowCopy; // fully populated model
    }


    public async deleteUserScriptShadowCopy(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId: string): Promise<object> {
        const deleted = await UserScriptShadowCopyModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, "UserScriptShadowCopy", correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }
}

export const userScriptShadowCopyService = new UserScriptShadowCopyService();