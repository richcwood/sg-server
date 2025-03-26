import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { InteractiveConsoleJob } from './TestArtifacts';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { TaskDefTarget, TaskStatus, JobStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';

const script1 = `
import time
print('start')
time.sleep(10)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test63;

export default class Test63 extends TestBase.WorkflowTestBase {
    constructor(testSetup) {
        super('Test63', testSetup);
        this.description = 'Target agent id as runtime variable';

        self = this;
    }

    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = process.env.sgTestTeam;

        const agent: any = self.testSetup.agents[0];

        let firstJob: any = _.cloneDeep(InteractiveConsoleJob);
        firstJob.job.name = 'IC - Test63';
        firstJob.job.tasks[0].target = TaskDefTarget.SINGLE_SPECIFIC_AGENT;
        firstJob.job.tasks[0].targetAgentId = '@sgg("_agentId")';
        firstJob.job.tasks[0].steps[0].script.code = script1_b64;
        firstJob.job.runtimeVars = { _agentId: { sensitive: false, value: agent.InstanceId() } };

        resApiCall = await this.testSetup.RestAPICall('job', 'POST', _teamId, null, firstJob);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `Job POST returned ${resApiCall.data.statusCode}`, firstJob });
            return false;
        }
        firstJob.job.id = resApiCall.data.data.id;

        const taskCreateBP: any = {
            domainType: 'Task',
            operation: 1,
            model: {
                status: null,
                autoRestart: false,
                _teamId: _teamId,
                name: firstJob.job.tasks[0].name,
                source: 1,
                target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
                targetAgentId: '@sgg("_agentId")',
                _jobId: firstJob.job.id,
                type: 'Task',
            },
        };
        self.bpMessagesExpected.push(taskCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        const task = _.filter(
            self.bpMessages,
            (x) => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == firstJob.job.id
        );

        const taskOutcomeCreateBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model: {
                _teamId: process.env.sgTestTeam,
                _jobId: firstJob.job.id,
                source: 1,
                status: TaskStatus.PUBLISHED,
                target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
                autoRestart: false,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskOutcomeCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        const taskOutcome = _.filter(
            self.bpMessages,
            (x) => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._taskId == task[0].model.id
        );

        const taskOutcomeCompletedBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model: {
                status: TaskStatus.SUCCEEDED,
                route: 'ok',
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskOutcomeCompletedBP);

        const jobCompleteBP: any = {
            domainType: 'Job',
            operation: 2,
            model: {
                status: JobStatus.COMPLETED,
                id: firstJob.job.id,
                type: 'Job',
            },
        };
        self.bpMessagesExpected.push(jobCompleteBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;

        return result;
    }
}
