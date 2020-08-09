import { convertData } from '../utils/ResponseConverters';
import { BaseLogger } from '../../shared/SGLogger';
import { InvoiceSchema, InvoiceModel } from '../domain/Invoice';
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
import { OrgStorageModel } from '../domain/OrgStorage';
import { TaskSource } from '../../shared/Enums';


export class CreateInvoiceService {
    public async createInvoice(_orgId: mongodb.ObjectId, data: any, mongoLib: MongoRepo, logger: BaseLogger, correlationId: string, responseFields?: string): Promise<object> {
        data._orgId = _orgId;

        if (!data.startDate)
            throw new MissingObjectError('Missing startDate');
        const startDate = moment(data.startDate);
        if (!startDate.isValid())
            throw new ValidationError(`Start date "${data.startDate}" is not a valid date`);

        if (!data.endDate)
            throw new MissingObjectError('Missing endDate');
        const endDate = moment(data.endDate);
        if (!endDate.isValid())
            throw new ValidationError(`End date "${data.endDate}" is not a valid date`);

        const daysInBillingPeriod = endDate.diff(startDate, 'days') + 1;

        const billingSettings = await settingsService.findSettings('Billing');

        data.dueDate = endDate.add(parseInt(billingSettings.invoiceDueGracePeriodDays), 'days');

        const freeTierSettings = await settingsService.findSettings('FreeTierLimits');

        /// Get the number of new agents since the start of the billing cycle minus the first ten free agents
        data.numNewAgents = 0;
        let newAgentsFilter: any = {};
        newAgentsFilter['_orgId'] = _orgId;
        newAgentsFilter['createDate'] = { $gte: startDate.toDate() };

        let numNewAgents: number = 0;
        let numNewAgentsQuery = await AgentModel.aggregate([
            { $match: newAgentsFilter },
            { $count: "num_new_agents" }
        ]);
        if (_.isArray(numNewAgentsQuery) && (numNewAgentsQuery.length > 0))
            numNewAgents = numNewAgentsQuery[0].num_new_agents;

        let numOldAgents = 0;
        let oldAgentsFilter: any = {};
        oldAgentsFilter['_orgId'] = _orgId;
        oldAgentsFilter['createDate'] = { $lt: startDate.toDate() };

        let numOldAgentsQuery = await AgentModel.aggregate([
            { $match: oldAgentsFilter },
            { $count: "num_old_agents" }
        ]);
        if (_.isArray(numOldAgentsQuery) && numOldAgentsQuery.length > 0)
            numOldAgents = numOldAgentsQuery[0].num_old_agents;
        let freeAgents = freeTierSettings.maxAgents - numOldAgents;
        freeAgents = Math.max(freeAgents, 0);

        data.numNewAgents = numNewAgents - freeAgents;
        data.numNewAgents = Math.max(data.numNewAgents, 0);

        /// Get current job history storage amount
        let org = await orgService.findOrg(_orgId, 'jobStorageSpaceHighWatermark');
        data.storageMB = Math.round(org.jobStorageSpaceHighWatermark / (1024 * 1024));

        /// Get number of non-interactive console scripts executed in billing period
        let invoiceScriptsFilter: any = {};
        invoiceScriptsFilter['_orgId'] = _orgId;
        invoiceScriptsFilter['dateStarted'] = { $gte: startDate.toDate(), $lt: endDate.toDate() };
        invoiceScriptsFilter['_invoiceId'] = { $exists: false };
        invoiceScriptsFilter['source'] = TaskSource.JOB;

        let numScriptsQuery = await StepOutcomeModel.aggregate([
            { $match: invoiceScriptsFilter },
            { $count: "num_scripts" }
        ]);
        if (_.isArray(numScriptsQuery) && numScriptsQuery.length > 0)
            data.numScripts = numScriptsQuery[0].num_scripts;
        else
            data.numScripts = 0;

        /// Get number of interactive console scripts executed in billing period
        let invoiceICScriptsFilter: any = {};
        invoiceICScriptsFilter['_orgId'] = _orgId;
        invoiceICScriptsFilter['dateStarted'] = { $gte: startDate.toDate(), $lt: endDate.toDate() };
        invoiceICScriptsFilter['_invoiceId'] = { $exists: false };
        invoiceICScriptsFilter['source'] = TaskSource.CONSOLE;

        let numICScriptsQuery = await StepOutcomeModel.aggregate([
            { $match: invoiceICScriptsFilter },
            { $count: "num_scripts" }
        ]);
        if (_.isArray(numICScriptsQuery) && numICScriptsQuery.length > 0)
            data.numICScripts = numICScriptsQuery[0].num_scripts;
        else
            data.numICScripts = 0;

        /// Get total artifacts downloaded size for this billing period
        data.artifactsDownloadedGB = 0;
        let taskOutcomesFilter: any = {};
        taskOutcomesFilter['_orgId'] = _orgId;
        taskOutcomesFilter['dateStarted'] = { $gte: startDate.toDate() };

        let artifactDownloadsQuery = await TaskOutcomeModel.aggregate([
            { $match: taskOutcomesFilter },
            { $group: { _id: null, sumArtifactsDownloadedSize: { $sum: "$artifactsDownloadedSize" } } }
        ]);
        if (_.isArray(artifactDownloadsQuery) && artifactDownloadsQuery.length > 0) {
            data.artifactsDownloadedGB = artifactDownloadsQuery[0].sumArtifactsDownloadedSize / 1024 / 1024 / 1024;
            data.artifactsDownloadedGB = data.artifactsDownloadedGB - freeTierSettings.freeArtifactsDownloadBytes;
            data.artifactsDownloadedGB = Math.max(data.artifactsDownloadedGB, 0);
        }

        /// Get total artifacts storage for this billing period
        data.artifactsStorageGB = 0;
        let orgStorageFilter: any = {};
        orgStorageFilter['_orgId'] = _orgId;
        orgStorageFilter['date'] = { $gte: startDate.toDate(), $lte: endDate.toDate() };

        let artifactStorageQuery = await OrgStorageModel.find(orgStorageFilter).select('numobservations bytes');
        if (_.isArray(artifactStorageQuery) && artifactStorageQuery.length > 0) {
            let totalByteHours = 0;
            for (let i = 0; i < artifactStorageQuery.length; i++) {
                const numObservations = artifactStorageQuery[i].numobservations;
                const bytes = artifactStorageQuery[i].bytes;
                const byteHours = bytes * (24 / numObservations);
                totalByteHours += byteHours;
            }

            const numObservationDays = artifactStorageQuery.length;
            totalByteHours = (totalByteHours * daysInBillingPeriod/numObservationDays);

            const hoursInBillingPeriod = daysInBillingPeriod*24;

            /// bytes/gb = 1,073,741,824
            data.artifactsStorageGB = (totalByteHours - freeTierSettings.freeArtifactsStorageBytes) / 1073741824 / hoursInBillingPeriod;
            data.artifactsStorageGB = Math.max(data.artifactsStorageGB, 0);
        }

        /// Get billing rates from default settings if not provided explicitly
        if (!data.scriptPricing || !data.jobStoragePerMBRate || !data.newAgentRate || !data.defaultArtifactsStoragePerGBRate || !data.artifactsDownloadedPerGBRate) {
            if (!data.scriptPricing)
                data.scriptPricing = billingSettings.defaultScriptPricing;
            if (!data.jobStoragePerMBRate)
                data.jobStoragePerMBRate = billingSettings.defaultJobStoragePerMBRate;
            if (!data.newAgentRate)
                data.newAgentRate = billingSettings.defaultNewAgentRate;
            if (!data.artifactsStoragePerGBRate)
                data.artifactsStoragePerGBRate = billingSettings.defaultArtifactsStoragePerGBRate;
            if (!data.artifactsDownloadedPerGBRate)
                data.artifactsDownloadedPerGBRate = billingSettings.defaultArtifactsDownloadedPerGBRate;
        }

        const scriptBillAmount = SGUtils.scriptBillingCalculator(data.scriptPricing, data.numScripts);
        data.scriptRate = 0;
        if (data.numScripts > 0)
            data.scriptRate = scriptBillAmount / data.numScripts;

        data.billAmount = scriptBillAmount +
            (data.jobStoragePerMBRate * data.storageMB) +
            (data.newAgentRate * data.numNewAgents) +
            (data.artifactsStoragePerGBRate * data.artifactsStorageGB) +
            (data.artifactsDownloadedPerGBRate * data.artifactsDownloadedGB);
        // if (data.billAmount <= 0)
        //     return null;

        data.paidAmount = 0.0;

        const invoiceModel = new InvoiceModel(data);
        const newInvoice = await invoiceModel.save();

        // const res = await StepOutcomeModel.udpateMany( invoiceScriptsFilter, { $set: { _invoiceId: newInvoice._id }});
        const res: any = await mongoLib.UpdateMany('stepOutcome', invoiceScriptsFilter, { $set: { _invoiceId: newInvoice._id } });
        if (res.matchedCount != res.modifiedCount != newInvoice.numScripts) {
            logger.LogError(`Create invoice error: counts mismatch`, { _orgId, _invoiceId: newInvoice._id, numScripts: newInvoice.numScripts, matchedCount: res.matchedCount, modifiedCount: res.modifiedCount });
        }
        await mongoLib.UpdateMany('stepOutcome', invoiceICScriptsFilter, { $set: { _invoiceId: newInvoice._id } });

        await rabbitMQPublisher.publish(_orgId, "Invoice", correlationId, PayloadOperation.CREATE, convertData(InvoiceSchema, newInvoice));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return invoiceService.findInvoice(_orgId, newInvoice.id, responseFields);
        }
        else {
            return newInvoice; // fully populated model
        }
    }
}

export const createInvoiceService = new CreateInvoiceService();