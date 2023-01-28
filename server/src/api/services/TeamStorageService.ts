import { convertData } from '../utils/ResponseConverters';
import { TeamStorageSchema, TeamStorageModel } from '../domain/TeamStorage';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import * as moment from 'moment';

export class TeamStorageService {
    public async findAllTeamStoragesInternal(filter?: any, responseFields?: string) {
        return TeamStorageModel.find(filter).select(responseFields);
    }

    public async findAllTeamStorages(_teamId: mongodb.ObjectId, responseFields?: string) {
        return TeamStorageModel.find({ _teamId }).select(responseFields);
    }

    public async findTeamStorage(_teamId: mongodb.ObjectId, teamStorageId: mongodb.ObjectId, responseFields?: string) {
        return TeamStorageModel.findById(teamStorageId).find({ _teamId }).select(responseFields);
    }

    public async createTeamStorageInternal(data: any): Promise<object> {
        const model = new TeamStorageModel(data);
        await model.save();
        return;
    }

    public async createTeamStorage(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<object> {
        if (!data.date) throw new MissingObjectError('Missing date');

        const date = moment.utc(data.date);
        if (!date.isValid()) throw new ValidationError('Invalid date');
        data.date = date.toDate().toISOString();

        data._teamId = _teamId;
        const teamStorageModel = new TeamStorageModel(data);
        const newTeamStorage = await teamStorageModel.save();

        // await rabbitMQPublisher.publish(_teamId, "TeamStorage", correlationId, PayloadOperation.CREATE, convertData(TeamStorageSchema, newTeamStorage));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findTeamStorage(_teamId, newTeamStorage.id, responseFields);
        } else {
            return newTeamStorage; // fully populated model
        }
    }

    public async updateTeamStorage(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<object> {
        const filter = { _id: id, _teamId };
        data = Object.assign(data, { $inc: { numobservations: 1 } });
        const updatedTeamStorage = await TeamStorageModel.findOneAndUpdate(filter, data, { new: true }).select(
            responseFields
        );

        if (!updatedTeamStorage)
            throw new MissingObjectError(
                `TeamStorage '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        // const deltas = Object.assign({ _id: id }, data);
        // await rabbitMQPublisher.publish(_teamId, "TeamStorage", correlationId, PayloadOperation.UPDATE, convertData(TeamStorageSchema, deltas));

        return updatedTeamStorage; // fully populated model
    }
}

export const teamStorageService = new TeamStorageService();
