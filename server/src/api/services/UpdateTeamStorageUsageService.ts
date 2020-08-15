import { convertData } from '../utils/ResponseConverters';
import { BaseLogger } from '../../shared/SGLogger';
import { TeamStorageSchema, TeamStorageModel } from '../domain/TeamStorage';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { settingsService } from '../services/SettingsService';
import { StepOutcomeModel } from '../domain/StepOutcome';
import { TaskOutcomeModel } from '../domain/TaskOutcome';
import { AgentModel } from '../domain/Agent';
import { SGUtils } from '../../shared/SGUtils';
import { teamService } from './TeamService';
import { invoiceService } from './InvoiceService';
import { MongoRepo } from '../../shared/MongoLib';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import * as moment from 'moment';
import { teamStorageService } from './TeamStorageService';


export class UpdateTeamStorageUsageService {
    public async updateDailyTeamStorageUsage(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        if (!data.date)
            throw new MissingObjectError('Missing date');
        if (!data.bytes)
            throw new MissingObjectError('Missing bytes');

        if (!_.isNumber(data.bytes))
            throw new ValidationError(`bytes value "${data.bytes}" must be a valid number`);

        const date = moment.utc(data.date);
        if (!date.isValid())
            throw new ValidationError('Invalid date');
        data.date = date.toDate().toISOString();

        data._teamId = _teamId;

        const filter = { _teamId, date: data.date };

        let teamStorage: TeamStorageSchema;
        let teamStorageQuery: any = await teamStorageService.findAllTeamStoragesInternal(filter, 'bytes');
        if (!_.isArray(teamStorageQuery) || teamStorageQuery.length === 0) {
            teamStorage = <TeamStorageSchema>await teamStorageService.createTeamStorage(_teamId, data);
        } else {
            teamStorage = teamStorageQuery[0];
            const newBytes = teamStorage.bytes + data.bytes;
            teamStorage = <TeamStorageSchema>await teamStorageService.updateTeamStorage(_teamId, teamStorage._id, {bytes: newBytes});
        }

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return teamStorageService.findTeamStorage(_teamId, teamStorage._id, responseFields);
        }
        else {
            return teamStorage; // fully populated model
        }
    }
}

export const updateTeamStorageUsageService = new UpdateTeamStorageUsageService();