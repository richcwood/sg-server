import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { InteractiveConsoleJob } from './TestArtifacts';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { TaskDefTarget, TaskStatus, JobStatus, TaskFailureCode } from '../../server/src/shared/Enums';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


const script1 = `
import time
print 'start'
time.sleep(10)
print 'done'
print '@sgo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test46;


export default class Test46 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test46', testSetup);
        this.description = 'Attempt to restart job that failed with code NO_AGENT_AVAILABLE - should get an api error';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        let firstJob: any = _.cloneDeep(InteractiveConsoleJob);
        firstJob.job.name = 'IC - Test46';
        firstJob.job.tasks[0].target = TaskDefTarget.SINGLE_SPECIFIC_AGENT;
        firstJob.job.tasks[0].targetAgentId = new mongodb.ObjectId();
        firstJob.job.tasks[0].steps[0].script.code = script1_b64;

        resApiCall = await this.testSetup.RestAPICall('job', 'POST', _teamId, null, firstJob);
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
                _teamId: _teamId,
                name: firstJob.job.tasks[0].name,
                source: 1,
                target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
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

        resApiCall = await this.testSetup.RestAPICall(`jobaction/restart/${firstJob.job.id}`, 'POST', _teamId, null);
        if (resApiCall.data.statusCode != 400) {
            self.logger.LogError('Failed', { Message: `jobaction/restart/${firstJob.job.id} POST returned ${resApiCall.data.statusCode} - should have returned 400` });
            return false;
        }

        const expectedError = `Job ${firstJob.job.id} cannot be restarted since current status is "RUNNING"`;
        if (resApiCall.data.errors[0].description != expectedError) {
            self.logger.LogError('Failed', { Message: `jobaction/restart/${firstJob.job.id} POST error description = "${resApiCall.data.errors[0].description}" - should have returned "${expectedError}"` });
            return false;
        }


        await self.testSetup.RestAPICall(`jobaction/cancel/${firstJob.job.id}`, 'POST', _teamId, null, null);

        const jobCompleteBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: JobStatus.COMPLETED,
                id: firstJob.job.id,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(jobCompleteBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        return result;
    }
}
