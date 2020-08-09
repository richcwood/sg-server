import { StepOutcomeModel } from '../api/domain/StepOutcome';
import { TaskOutcomeModel } from '../api/domain/TaskOutcome';
import { orgService } from '../api/services/OrgService';
import { OrgPricingTier } from './Enums';
import { SGUtils } from './SGUtils';
import * as _ from 'lodash';
import { settingsService } from '../api/services/SettingsService';
import { MissingObjectError, FreeTierLimitExceededError } from '../api/utils/Errors';
import { S3Access } from '../shared/S3Access';
import { rabbitMQPublisher } from '../api/utils/RabbitMQPublisher';
import * as mongodb from 'mongodb';
import * as config from 'config';


export class FreeTierChecks {
    static MaxScriptsCheck = async (_orgId: mongodb.ObjectId) => {
        const org = await orgService.findOrg(_orgId, 'pricingTier');
        if (!org)
            throw new MissingObjectError(`Org '${_orgId.toHexString()} not found`);
        if (org.pricingTier == OrgPricingTier.FREE) {
            let numStepsStarted = 0;
            const billingCycle = SGUtils.GetCurrentBillingCycleDates();
            let stepOutcomesFilter: any = {};
            stepOutcomesFilter['_orgId'] = new mongodb.ObjectId(_orgId);
            stepOutcomesFilter['dateStarted'] = { $gte: billingCycle.start };

            let numStepsQuery = await StepOutcomeModel.aggregate([
                { $match: stepOutcomesFilter },
                { $count: 'num_steps' }
            ]);
            if (_.isArray(numStepsQuery) && numStepsQuery.length > 0)
                numStepsStarted = numStepsQuery[0].num_steps;

            const freeTierSettings = await settingsService.findSettings('FreeTierLimits');
            if (numStepsStarted >= freeTierSettings.maxScriptsPerBillingCycle) {
                const msg = `You have reached the maximum number of scripts you can run in this billing cycle on the free tier - please upgrade to the paid tier to run additional scripts`;
                rabbitMQPublisher.publishBrowserAlert(_orgId, msg);
                throw new FreeTierLimitExceededError(msg);
            }
        }
    }


    static MaxArtifactStorageCheck = async (_orgId: mongodb.ObjectId) => {
        const org = await orgService.findOrg(_orgId, 'pricingTier');
        if (!org)
            throw new MissingObjectError(`Org '${_orgId.toHexString()} not found`);

        if (org.pricingTier == OrgPricingTier.FREE) {
            let s3Access = new S3Access();
            let s3Path = '';
            if (config.get('environment') != 'production')
                s3Path += `${config.get('environment')}/`;
            s3Path += `${_orgId.toHexString()}/`;

            const currentStorageUsage = s3Access.sizeOf(s3Path, config.get('S3_BUCKET_TEAM_ARTIFACTS'));
            const freeTierSettings = await settingsService.findSettings('FreeTierLimits');
            if (currentStorageUsage >= freeTierSettings.freeArtifactsStorageBytes) {
                const msg = `You have reached the maximum amount of artifacts storage on the free tier - please upgrade to the paid tier to create additional artifacts`;
                rabbitMQPublisher.publishBrowserAlert(_orgId, msg);
                throw new FreeTierLimitExceededError(msg);
            }
        }
    }


    static MaxArtifactDownloadsCheck = async (_orgId: mongodb.ObjectId) => {
        const org = await orgService.findOrg(_orgId, 'pricingTier');
        if (!org)
            throw new MissingObjectError(`Org '${_orgId.toHexString()} not found`);

        if (org.pricingTier == OrgPricingTier.FREE) {
            let currentArtifactsDownloadedGB = 0;
            const billingCycle = SGUtils.GetCurrentBillingCycleDates();
            let taskOutcomesFilter: any = {};
            taskOutcomesFilter['_orgId'] = _orgId;
            taskOutcomesFilter['dateStarted'] = { $gte: billingCycle.start };

            let artifactDownloadsQuery = await TaskOutcomeModel.aggregate([
                { $match: taskOutcomesFilter },
                { $group: { _id: null, sumArtifactsDownloadedSize: { $sum: "$artifactsDownloadedSize" } } }
            ]);
            if (_.isArray(artifactDownloadsQuery) && artifactDownloadsQuery.length > 0) {
                currentArtifactsDownloadedGB = artifactDownloadsQuery[0].sumArtifactsDownloadedSize / 1024 / 1024 / 1024;

                const freeTierSettings = await settingsService.findSettings('FreeTierLimits');
                currentArtifactsDownloadedGB = currentArtifactsDownloadedGB - freeTierSettings.freeArtifactsDownloadBytes;
                currentArtifactsDownloadedGB = Math.max(currentArtifactsDownloadedGB, 0);

                if (currentArtifactsDownloadedGB >= freeTierSettings.freeArtifactsDownloadBytes) {
                    const msg = `You have reached the maximum amount of artifact downloads in this billing cycle on the free tier - please upgrade to the paid tier to download additional artifacts`;
                    rabbitMQPublisher.publishBrowserAlert(_orgId, msg);
                    throw new FreeTierLimitExceededError(msg);
                }
            }
        }
    }
}

