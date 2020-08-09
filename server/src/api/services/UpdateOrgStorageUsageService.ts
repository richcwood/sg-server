import { convertData } from '../utils/ResponseConverters';
import { BaseLogger } from '../../shared/SGLogger';
import { OrgStorageSchema, OrgStorageModel } from '../domain/OrgStorage';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { settingsService } from '../services/SettingsService';
import { StepOutcomeModel } from '../domain/StepOutcome';
import { TaskOutcomeModel } from '../domain/TaskOutcome';
import { AgentModel } from '../domain/Agent';
import { SGUtils } from '../../shared/SGUtils';
import { orgService } from './OrgService';
import { invoiceService } from './InvoiceService';
import { MongoRepo } from '../../shared/MongoLib';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import * as moment from 'moment';
import { orgStorageService } from './OrgStorageService';


export class UpdateOrgStorageUsageService {
    public async updateDailyOrgStorageUsage(_orgId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
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

        data._orgId = _orgId;

        const filter = { _orgId, date: data.date };

        let orgStorage: OrgStorageSchema;
        let orgStorageQuery: any = await orgStorageService.findAllOrgStoragesInternal(filter, 'bytes');
        if (!_.isArray(orgStorageQuery) || orgStorageQuery.length === 0) {
            orgStorage = <OrgStorageSchema>await orgStorageService.createOrgStorage(_orgId, data);
        } else {
            orgStorage = orgStorageQuery[0];
            const newBytes = orgStorage.bytes + data.bytes;
            orgStorage = <OrgStorageSchema>await orgStorageService.updateOrgStorage(_orgId, orgStorage._id, {bytes: newBytes});
        }

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return orgStorageService.findOrgStorage(_orgId, orgStorage._id, responseFields);
        }
        else {
            return orgStorage; // fully populated model
        }
    }
}

export const updateOrgStorageUsageService = new UpdateOrgStorageUsageService();