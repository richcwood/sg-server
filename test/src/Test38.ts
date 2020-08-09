import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { LongRunningJob, InteractiveConsoleJob } from './TestArtifacts';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { TaskDefTarget } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test38;


export default class Test38 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test38', testSetup);
        this.description = 'Max active tasks test';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _orgId: string = config.get('sgTestOrg');

        let agentMachineId: string = self.testSetup.agents[0].machineId;
        let agentId: string;
        resApiCall = await self.testSetup.RestAPICall(`agent?filter=machineId==${agentMachineId}&responseFields=id`, 'GET', _orgId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `agent/name/${agentMachineId}?responseFields=id GET returned ${resApiCall.data.statusCode}` });
            return false;
        }
        agentId = resApiCall.data.data[0].id;

        resApiCall = await self.testSetup.RestAPICall(`agent/properties/${agentId}`, 'PUT', _orgId, null, { maxActiveTasks: 1 });
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `agent/properties/${agentId} PUT returned ${resApiCall.data.statusCode}`, maxActiveTasks: 1 });
            return false;
        }


        let firstJob: any = _.clone(LongRunningJob);
        firstJob.job.tasks[0].target = TaskDefTarget.SINGLE_SPECIFIC_AGENT;
        firstJob.job.tasks[0].targetAgentId = agentId;

        resApiCall = await self.testSetup.RestAPICall('job', 'POST', _orgId, null, firstJob);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `Job POST returned ${resApiCall.data.statusCode}`, firstJob });
            return false;
        }
        firstJob.job.id = resApiCall.data.data.id;

        self.bpMessagesExpected.push(
            {
                domainType: 'TaskOutcome',
                operation: 1,
                model:
                {
                    _orgId: config.get('sgTestOrg'),
                    _jobId: firstJob.job.id,
                    source: 1,
                    status: 10,
                    target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
                    _agentId: agentId,
                    autoRestart: false,
                    type: 'TaskOutcome'
                }
            });

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        let secondJob: any = _.cloneDeep(InteractiveConsoleJob);
        secondJob.job.name = 'IC - Test38';
        secondJob.job.tasks[0].targetAgentId = agentId;

        resApiCall = await self.testSetup.RestAPICall('job', 'POST', _orgId, null, secondJob);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `Job POST returned ${resApiCall.data.statusCode}`, secondJob });
            return false;
        }
        secondJob.job.id = resApiCall.data.data.id;

        self.dlqMessagesExpected.push(
            {
                type: 'TTLMessage',
                reason: 'rejected',
                values:
                {
                    name: secondJob.job.tasks[0].name,
                    targetAgentId: agentId,
                    target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
                    correlationId: secondJob.job.tasks[0].correlationId,
                    _jobId: secondJob.job.id
                }
            });

        result = await self.WaitForTestToComplete();
        self.bpMessagesExpected.length = 0;


        resApiCall = await self.testSetup.RestAPICall(`jobaction/cancel/${secondJob.job.id}`, 'POST', _orgId, null, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `jobaction/cancel/${secondJob.job.id} POST returned ${resApiCall.data.statusCode}`, secondJob });
            return false;
        }

        resApiCall = await self.testSetup.RestAPICall(`jobaction/cancel/${firstJob.job.id}`, 'POST', _orgId, null, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `jobaction/cancel/${firstJob.job.id} POST returned ${resApiCall.data.statusCode}`, firstJob });
            return false;
        }

        resApiCall = await self.testSetup.RestAPICall(`agent/properties/${agentId}`, 'PUT', _orgId, null, { maxActiveTasks: 10 });
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `agent/properties/${agentId} PUT returned ${resApiCall.data.statusCode}`, maxActiveTasks: 10 });
            return false;
        }


        return result;
    }
}
