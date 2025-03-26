import * as mongodb from 'mongodb';
import * as _ from 'lodash';

import { TeamSchema } from '../api/domain/Team';

import { TeamPricingTier } from './Enums';
import { FreeTierChecks } from './FreeTierChecks';
import { BaseLogger } from './SGLogger';

import db from '../test_helpers/DB';

import { CreateSettingsFromTemplate, CreateTeamFromTemplate } from '../test_helpers/TestArtifacts';

const testName = 'SaascipeServiceTest';

let logger;

beforeAll(async () => {
    await db.open();

    logger = new BaseLogger(testName);
});

afterAll(async () => await db.close());

let OnBrowserPush = async (params: any, msgKey: string, ch: any) => {
    logger.LogInfo('OnBrowserPush message', params);
};

describe('FreeTierChecks tests', () => {
    beforeAll(async () => {
        await CreateSettingsFromTemplate();
    });

    test('Free tier max script not exceeded test', async () => {
        const userId: mongodb.ObjectId = new mongodb.ObjectId();
        const team: TeamSchema = await CreateTeamFromTemplate(
            userId,
            { name: 'Test Team 1', cntFreeScriptsRun: 999 },
            logger
        );
        FreeTierChecks.MaxScriptsCheck(team.id);
    });

    test('Team not on free tier and max free tier scripts exceeded test', async () => {
        const userId: mongodb.ObjectId = new mongodb.ObjectId();
        const team: TeamSchema = await CreateTeamFromTemplate(
            userId,
            { name: 'Test Team 2', cntFreeScriptsRun: 1001, pricingTier: TeamPricingTier.PAID },
            logger
        );
        FreeTierChecks.MaxScriptsCheck(team.id);
    });

    test('Free tier max script exceeded test', async () => {
        const userId: mongodb.ObjectId = new mongodb.ObjectId();
        const team: TeamSchema = await CreateTeamFromTemplate(
            userId,
            { name: 'Test Team 3', cntFreeScriptsRun: 1001 },
            logger
        );
        await expect(FreeTierChecks.MaxScriptsCheck(team.id)).rejects.toThrow(
            'You have reached the maximum number of free scripts - please upgrade to run additional scripts'
        );
    });

    afterAll(async () => await db.clearDatabase());
});
