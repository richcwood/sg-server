import * as mongodb from 'mongodb';
import * as _ from 'lodash';

import { TeamSchema } from '../domain/Team';

import { stepOutcomeService } from './StepOutcomeService';
import { teamService } from './TeamService';

import { BaseLogger } from '../../shared/SGLogger';

import { MissingObjectError } from '../utils/Errors';

import db from '../../test_helpers/DB';

import { CreateSettingsFromTemplate, CreateTeamFromTemplate } from '../../test_helpers/TestArtifacts';
import { validateEquality } from '../../test_helpers/Validators';

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

describe('StepOutcome service tests', () => {
    const _userId: mongodb.ObjectId = new mongodb.ObjectId();
    const _jobId: mongodb.ObjectId = new mongodb.ObjectId();
    const _stepId: mongodb.ObjectId = new mongodb.ObjectId();
    const _taskOutcomeId: mongodb.ObjectId = new mongodb.ObjectId();

    beforeAll(async () => {
        await CreateSettingsFromTemplate();
    });

    test('Update team script count test', async () => {
        let _teamId: mongodb.ObjectId;
        let team: TeamSchema;
        team = await CreateTeamFromTemplate(_userId, { name: 'Test Team 1' }, logger);
        _teamId = team.id;
        const data: any = {
            _teamId,
            _jobId,
            _stepId,
            _taskOutcomeId,
            name: 'step 1',
            source: 1,
            machineId: 'test machine',
            ipAddress: 'xxx.xxx.xxx.xxx',
            runCode: 'xxx',
            status: 20,
            dateStarted: Date.now() - 10000,
            dateCompleted: Date.now(),
            exitCode: 0,
            runtimeVars: {},
            signal: null,
            stderr: '',
            stdout: '',
        };
        await stepOutcomeService.createStepOutcome(_teamId, data, 'test1_correlation_id');
        team = await teamService.findTeam(_teamId, 'cntFreeScriptsRun');
        if (!team) throw new MissingObjectError(`Team '${_teamId.toHexString()} not found`);
        await validateEquality(team.cntFreeScriptsRun, 1);
    });

    afterAll(async () => await db.clearDatabase());
});
