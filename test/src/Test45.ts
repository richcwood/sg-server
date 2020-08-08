import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { InteractiveConsoleJob } from './TestArtifacts';
import { KikiUtils } from '../../server/src/shared/KikiUtils';
import { TaskDefTarget, TaskStatus, JobStatus, TaskFailureCode } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
print 'start'
time.sleep(10)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = KikiUtils.btoa(script1);


let self: Test45;


export default class Test45 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test45', testSetup);
        this.description = 'Route task to unavailable agent - fail - connect agent - succeeds';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _orgId: string = config.get('sgTestOrg');

        const agent: any = self.testSetup.agents[0];

        agent.offline = true;
        await agent.SendHeartbeat(false, true);
        await agent.Stop();

        let firstJob: any = _.cloneDeep(InteractiveConsoleJob);
        firstJob.job.name = 'IC - Test45';
        firstJob.job.tasks[0].target = TaskDefTarget.SINGLE_SPECIFIC_AGENT;
        firstJob.job.tasks[0].targetAgentId = agent.InstanceId();
        firstJob.job.tasks[0].steps[0].script.code = script1_b64;

        resApiCall = await this.testSetup.RestAPICall('job', 'POST', _orgId, null, firstJob);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `Job POST returned ${resApiCall.data.statusCode}`, firstJob });
            return false;
        }
        firstJob.job.id = resApiCall.data.data.id;

        const taskCreateBP: any = {
            domainType: 'Task',
            operation: 1,
            model:
            {
                status: null,
                autoRestart: false,
                _orgId: _orgId,
                name: firstJob.job.tasks[0].name,
                source: 1,
                target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
                targetAgentId: agent.InstanceId(),
                _jobId: firstJob.job.id,
                type: 'Task'
            }
        };
        self.bpMessagesExpected.push(taskCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const task = _.filter(self.bpMessages, x => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == firstJob.job.id);

        const taskUpdateBP: any = {
            domainType: 'Task',
            operation: 2,
            model:
            {
                status: TaskStatus.WAITING_FOR_AGENT,
                failureCode: TaskFailureCode.NO_AGENT_AVAILABLE,
                route: '',
                id: task[0].model.id,
                type: 'Task'
            }
        };
        self.bpMessagesExpected.push(taskUpdateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        agent.offline = false;
        agent.stopped = false;
        await agent.Init();

        const taskOutcomeCreateBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model:
            {
                _orgId: config.get('sgTestOrg'),
                _jobId: firstJob.job.id,
                source: 1,
                status: 10,
                target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
                autoRestart: false,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const taskOutcome = _.filter(self.bpMessages, x => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._taskId == task[0].model.id);

        const taskOutcomeCompletedBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.SUCCEEDED,
                route: 'ok',
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        }
            ;
        self.bpMessagesExpected.push(taskOutcomeCompletedBP);

        const jobCompleteBP: any = {
            domainType: 'Job',
            operation: 2,
            model: {
                status: JobStatus.COMPLETED,
                id: firstJob.job.id,
                type: 'Job'
            }
        }
        self.bpMessagesExpected.push(jobCompleteBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;


        return result;
    }
}
