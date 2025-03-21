import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { InteractiveConsoleJob } from './TestArtifacts';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { TaskDefTarget, TaskStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';

const script1 = `
import time
print('start')
time.sleep(10)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test40;

export default class Test40 extends TestBase.WorkflowTestBase {
    constructor(testSetup) {
        super('Test40', testSetup);
        this.description = 'Restart one failed task outcome when task routed to "all agents with tags"';

        self = this;
    }

    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = process.env.sgTestTeam;

        let firstJob: any = _.cloneDeep(InteractiveConsoleJob);
        firstJob.job.name = 'IC - Test40';
        firstJob.job.tasks[0].target = TaskDefTarget.ALL_AGENTS_WITH_TAGS;
        firstJob.job.tasks[0].requiredTags = { numchucks: 'true' };

        resApiCall = await this.testSetup.RestAPICall('job', 'POST', _teamId, null, firstJob);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `Job POST returned ${resApiCall.data.statusCode}`, firstJob });
            return false;
        }
        firstJob.job.id = resApiCall.data.data.id;

        const taskCreateBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model: {
                _teamId: process.env.sgTestTeam,
                _jobId: firstJob.job.id,
                source: 1,
                status: TaskStatus.PUBLISHED,
                target: TaskDefTarget.ALL_AGENTS_WITH_TAGS,
                autoRestart: false,
                type: 'TaskOutcome',
            },
        };
        for (let i = 0; i < 2; i++) self.bpMessagesExpected.push(_.clone(taskCreateBP));

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        let taskOutcomeId: string;
        resApiCall = await this.testSetup.RestAPICall(
            `taskoutcome?filter=_jobId==${firstJob.job.id}&responseFields=id&limit=1`,
            'GET',
            _teamId,
            null
        );
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', {
                Message: `taskoutcome?filter=_jobId==${firstJob.job.id}&responseFields=id&limit=1 GET returned ${resApiCall.data.statusCode}`,
            });
            return false;
        }
        taskOutcomeId = resApiCall.data.data[0].id;

        resApiCall = await this.testSetup.RestAPICall(
            `taskoutcomeaction/interrupt/${taskOutcomeId}`,
            'POST',
            _teamId,
            null
        );
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', {
                Message: `taskoutcomeaction/interrupt/${taskOutcomeId} GET returned ${resApiCall.data.statusCode}`,
            });
            return false;
        }

        const taskInterruptBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model: {
                id: taskOutcomeId,
                route: 'interrupt',
                status: 15,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskInterruptBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        resApiCall = await this.testSetup.RestAPICall(
            `taskoutcomeaction/restart/${taskOutcomeId}`,
            'POST',
            _teamId,
            null
        );
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', {
                Message: `taskoutcomeaction/restart/${taskOutcomeId} GET returned ${resApiCall.data.statusCode}`,
            });
            return false;
        }

        const taskRestartBPRunning: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model: {
                id: taskOutcomeId,
                status: 21,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskRestartBPRunning);

        const taskRestartBPComplete: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model: {
                status: 20,
                route: 'ok',
                type: 'TaskOutcome',
            },
        };

        for (let i = 0; i < 2; i++) self.bpMessagesExpected.push(_.clone(taskRestartBPComplete));

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        return result;
    }
}
