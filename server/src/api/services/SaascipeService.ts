import { convertData } from '../utils/ResponseConverters';
import { SaascipeSchema, SaascipeModel } from '../domain/Saascipe';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';

export class SaascipeService {
    public async findAllSaascipesInternal(filter?: any, responseFields?: string) {
        return SaascipeModel.find(filter).select(responseFields);
    }

    public async findSaascipe(saascipeId: mongodb.ObjectId, responseFields?: string): Promise<SaascipeSchema | null> {
        return SaascipeModel.findById(saascipeId).select(responseFields);
    }

    public async createSaascipe(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<SaascipeSchema> {
        const existingSaascipeQuery: any = await this.findAllSaascipesInternal({
            _publisherTeamId: _teamId,
            name: data.name,
        });
        if (_.isArray(existingSaascipeQuery) && existingSaascipeQuery.length > 0)
            throw new ValidationError(`Saascipe "${data.name}" already exists`);

        if (!data.hasOwnProperty('_sourceId')) throw new ValidationError(`Missing required field "_sourceId"`);
        if (!data.hasOwnProperty('saascipeType')) throw new ValidationError(`Missing required field "saascipeType"`);

        data._publisherTeamId = _teamId;
        const saascipeModel = new SaascipeModel(data);
        const newSaascipe = await saascipeModel.save();

        await rabbitMQPublisher.publish(
            _teamId,
            'Saascipe',
            correlationId,
            PayloadOperation.CREATE,
            convertData(SaascipeSchema, newSaascipe)
        );

        return this.findSaascipe(newSaascipe._id, responseFields);
    }

    public async updateSaascipe(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        filter?: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<SaascipeSchema> {
        if (data.name) {
            const existingSaascipeQuery: any = await this.findAllSaascipesInternal({
                _publisherTeamId: _teamId,
                name: data.name,
            });
            if (_.isArray(existingSaascipeQuery) && existingSaascipeQuery.length > 0)
                if (existingSaascipeQuery[0]._id.toHexString() != id.toHexString())
                    throw new ValidationError(`Saascipe with name "${data.name}" already exists`);
        }

        const defaultFilter = { _id: id, _publisherTeamId: _teamId };
        if (filter) filter = Object.assign(defaultFilter, filter);
        else filter = defaultFilter;

        // don't allow updating the currentVersion manually
        delete data.currentVersion;

        const saascipe = await SaascipeModel.findOneAndUpdate(filter, data);

        if (!saascipe) throw new MissingObjectError(`Saascipe with id '${id}' not found.`);

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(SaascipeSchema, deltas);
        await rabbitMQPublisher.publish(_teamId, 'Saascipe', correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return this.findSaascipe(id, responseFields);
    }

    public async deleteSaascipe(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        correlationId?: string
    ): Promise<object> {
        const deleted = await SaascipeModel.deleteOne({ _id: id });

        await rabbitMQPublisher.publish(_teamId, 'Saascipe', correlationId, PayloadOperation.DELETE, {
            id,
            correlationId,
        });

        return deleted;
    }
}

export const saascipeService = new SaascipeService();
