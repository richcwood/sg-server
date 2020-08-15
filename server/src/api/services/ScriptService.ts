import { convertData } from '../utils/ResponseConverters';
import { ScriptSchema, ScriptModel } from '../domain/Script';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class ScriptService {

    // Some services might need to add additional restrictions to bulk queries
    // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
    // public async updateBulkQuery(query): Promise<object> {
    //   // modify query here
    //   return query;
    // }

    // public async findAllScripts(_teamId: string, _taskId: string, responseFields?: string) {
    //     return ScriptModel.find({ _taskId }).select(responseFields);
    // }


    public async findAllScriptsInternal(filter?: any, responseFields?: string) {
        return ScriptModel.find(filter).select(responseFields);
    }


    public async findScript(_teamId: mongodb.ObjectId, scriptId: mongodb.ObjectId, responseFields?: string) {
        return ScriptModel.findById(scriptId).find({ _teamId }).select(responseFields);
    }


    public async createScriptInternal(data: any): Promise<object> {
        const model = new ScriptModel(data);
        const newScript = await model.save();
        return newScript;
    }


    public async createScript(_teamId: mongodb.ObjectId, data: any, _userId: mongodb.ObjectId, correlationId: string, responseFields?: string): Promise<object> {
        data._teamId = _teamId;

        const existingScriptQuery: any = await this.findAllScriptsInternal({ _teamId, name: data.name });
        if (_.isArray(existingScriptQuery) && existingScriptQuery.length > 0)
            throw new ValidationError(`Script with name "${data.name}" already exists`);
          
        if (!data.code)
            data.code = ' ';
        if (!data.shadowCopyCode)
            data.shadowCopyCode = data.code;
        data._originalAuthorUserId = _userId;
        data._lastEditedUserId = _userId;
        data.lastEditedDate = new Date();
        const scriptModel = new ScriptModel(data);
        const newScript = await scriptModel.save();

        await rabbitMQPublisher.publish(_teamId, "Script", correlationId, PayloadOperation.CREATE, convertData(ScriptSchema, newScript));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findScript(_teamId, newScript._id, responseFields);
        }
        else {
            return newScript; // fully populated model
        }
    }


    public async updateScript(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, _userId: mongodb.ObjectId, correlationId: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId, $or: [{ teamEditable: true }, { _originalAuthorUserId: _userId }] };

        data._lastEditedUserId = _userId;
        const updatedScript = await ScriptModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedScript)
            throw new ValidationError(`Script '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "Script", correlationId, PayloadOperation.UPDATE, convertData(ScriptSchema, deltas));

        return updatedScript; // fully populated model
    }
}

export const scriptService = new ScriptService();