import { convertData } from '../utils/ResponseConverters';
import { TeamVariableSchema, TeamVariableModel } from '../domain/TeamVariable';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class TeamVariableService {

    public async findAllTeamVariablesInternal(filter?: any, responseFields?: string) {
        return TeamVariableModel.find(filter).select(responseFields);
    }


    public async findAllTeamVariables(_teamId: mongodb.ObjectId, responseFields?: string) {
        return TeamVariableModel.find({ _teamId }).select(responseFields);
    }


    public async findTeamVariable(_teamId: mongodb.ObjectId, teamVariableId: mongodb.ObjectId, responseFields?: string) {
        return TeamVariableModel.findById(teamVariableId).find({ _teamId }).select(responseFields);
    }


    public async findTeamVariableByName(_teamId: mongodb.ObjectId, name: string, responseFields?: string) {
        return TeamVariableModel.find({ _teamId, name }).select(responseFields);
    }


    public async createTeamVariableInternal(data: any): Promise<object> {
        const model = new TeamVariableModel(data);
        await model.save();
        return;
    }


    public async createTeamVariable(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        if (!data.name)
            throw new ValidationError(`Request body missing "name" parameter`);
        if (!data.value)
            throw new ValidationError(`Request body missing "value" parameter`);


        let teamVars: TeamVariableSchema[] = await this.findTeamVariableByName(_teamId, data.name, 'value');
        if (_.isArray(teamVars) && teamVars.length > 0) {
            if (teamVars[0].value != data.value) {
                throw new ValidationError(`Value with name "${data.name}" already exists`);
            }else {
                return teamVars;
            }
        }

        data._teamId = _teamId;
        const teamVariableModel = new TeamVariableModel(data);
        const newTeamVariable = await teamVariableModel.save();

        await rabbitMQPublisher.publish(_teamId, "TeamVariable", correlationId, PayloadOperation.CREATE, convertData(TeamVariableSchema, newTeamVariable));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findTeamVariable(_teamId, newTeamVariable.id, responseFields);
        }
        else {
            return newTeamVariable; // fully populated model
        }
    }


    public async updateTeamVariable(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId };
        const updatedTeamVariable = await TeamVariableModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedTeamVariable)
            throw new MissingObjectError(`TeamVariable '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "TeamVariable", correlationId, PayloadOperation.UPDATE, convertData(TeamVariableSchema, deltas));

        return updatedTeamVariable; // fully populated model
    }


    public async deleteTeamVariable(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId: string): Promise<object> {
        const deleted = await TeamVariableModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, "TeamVariable", correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }
}

export const teamVariableService = new TeamVariableService();