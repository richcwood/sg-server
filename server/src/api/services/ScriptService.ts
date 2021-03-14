import { convertData } from '../utils/ResponseConverters';
import { ScriptSchema, ScriptModel } from '../domain/Script';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { StepDefModel } from '../domain/StepDef';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import { SGUtils } from '../../shared/SGUtils';


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


    public extractInjectionElems(data: any) {
        const code: string = SGUtils.atob(data.code);
        data.sggElems = [];
        let arrSgg: string[] = code.match(/@sgg?(\([^)]*\))/g);
        if (arrSgg) {
            for (let i = 0; i < arrSgg.length; i++) {
                let varKey = arrSgg[i].substr(5, arrSgg[i].length - 6);
                if (varKey.substr(0, 1) === '"' && varKey.substr(varKey.length - 1, 1) === '"')
                    varKey = varKey.slice(1, -1);
                data.sggElems.push(varKey);
            }
        }

        data.sgoElems = [];
        let arrSgo: string[] = code.match(/@sgo?(\{[^}]*\})/g);
        if (arrSgo) {
            for (let i = 0; i < arrSgo.length; i++) {
                try {
                    data.sgoElems = Object.keys(JSON.parse(arrSgo[i].substring(4)));
                } catch (e) {
                    try {
                        if (e.message.indexOf('Unexpected token \\') >= 0) {
                            let newVal = arrSgo[i].substring(4).replace(/\\+"/g, '"');
                            data.sgoElems = Object.keys(JSON.parse(newVal));
                        } else {
                            const re = /{['"]?([\w-]+)['"]?:[ '"]+([^,'"]+)['"]}/g;
                            const s = arrSgo[i].substring(4);
                            let m;
                            while ((m = re.exec(s)) != null) {
                                const key = m[1].trim();
                                data.sgoElems.push(key);
                            }
                        }
                    } catch (se) { }
                }
            }
        }

        data.sgsElems = [];
        let arrSgs: string[] = code.match(/@sgs?(\([^)]*\))/g);
        if (arrSgs) {
            for (let i = 0; i < arrSgs.length; i++) {
                let varKey = arrSgs[i].substr(5, arrSgs[i].length - 6);
                if (varKey.substr(0, 1) === '"' && varKey.substr(varKey.length - 1, 1) === '"')
                    varKey = varKey.slice(1, -1);
                data.sgsElems.push(varKey);
            }
        }
    }


    public async createScript(_teamId: mongodb.ObjectId, data: any, _userId: mongodb.ObjectId, correlationId: string, responseFields?: string): Promise<object> {
        data._teamId = _teamId;

        const existingScriptQuery: any = await this.findAllScriptsInternal({ _teamId, name: data.name });
        if (_.isArray(existingScriptQuery) && existingScriptQuery.length > 0)
            throw new ValidationError(`Script with name "${data.name}" already exists`);

        if (!data.code)
            data.code = ' ';
        else if (data.code)
            this.extractInjectionElems(data);

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
        if (data.name) {
            const existingScriptQuery: any = await this.findAllScriptsInternal({ _teamId, name: data.name });
            if (_.isArray(existingScriptQuery) && existingScriptQuery.length > 0)
                if (existingScriptQuery[0]._id.toHexString() != id.toHexString())
                    throw new ValidationError(`Script with name "${data.name}" already exists`);
        }

        if (data.code) {
            this.extractInjectionElems(data);
        }

        const filter = { _id: id, _teamId, $or: [{ teamEditable: true }, { _originalAuthorUserId: _userId }] };

        data._lastEditedUserId = _userId;
        const updatedScript = await ScriptModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedScript)
            throw new ValidationError(`Script '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "Script", correlationId, PayloadOperation.UPDATE, convertData(ScriptSchema, deltas));

        return updatedScript; // fully populated model
    }


    public async deleteScript(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId?: string): Promise<object> {
        let cntStepDefsTargetingThisAgent = await StepDefModel.count({_teamId, _scriptId: id.toHexString()});
        if (cntStepDefsTargetingThisAgent > 0)
            throw new ValidationError(`There are ${cntStepDefsTargetingThisAgent} job steps that are using this script`);

        const deleted = await ScriptModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, "Script", correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }
}

export const scriptService = new ScriptService();