import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { InteractiveConsoleJob } from './TestArtifacts';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { TaskDefTarget, TaskStatus, JobStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
print 'start'
time.sleep(10)
print 'done'
print '@sgo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test44;


export default class Test44 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test44', testSetup);
        this.description = 'Attempt to restart canceled job';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        let firstJob: any = _.cloneDeep(InteractiveConsoleJob);
        firstJob.job.name = 'IC - Test44';
        firstJob.job.tasks[0].target = TaskDefTarget.SINGLE_AGENT;
        firstJob.job.tasks[0].steps[0].script.code = script1_b64;

        resApiCall = await this.testSetup.RestAPICall('job', 'POST', _teamId, null, firstJob);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `Job POST returned ${resApiCall.data.statusCode}`, firstJob });
            return false;
        }
        firstJob.job.id = resApiCall.data.data.id;

        const taskCreateBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobId: firstJob.job.id,
                source: 1,
                status: 10,
                target: TaskDefTarget.SINGLE_AGENT,
                autoRestart: false,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const task = _.filter(self.bpMessages, x => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == firstJob.job.id);
        const taskOutcome = _.filter(self.bpMessages, x => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._taskId == task[0].model.id);

        resApiCall = await this.testSetup.RestAPICall(`jobaction/cancel/${firstJob.job.id}`, 'POST', _teamId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `jobaction/cancel/${firstJob.job.id} POST returned ${resApiCall.data.statusCode}` });
            return false;
        }

        const taskOutcomeCanceledBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.CANCELLED,
                route: 'interrupt',
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeCanceledBP);

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


        resApiCall = await this.testSetup.RestAPICall(`jobaction/restart/${firstJob.job.id}`, 'POST', _teamId, null);
        if (resApiCall.data.statusCode != 400) {
            self.logger.LogError('Failed', { Message: `jobaction/restart/${firstJob.job.id} POST returned ${resApiCall.data.statusCode}` });
            return false;
        } else if (resApiCall.data.errors[0].description != `Job ${firstJob.job.id} cannot be restarted since current status is "COMPLETED"`) {
            self.logger.LogError('Failed', { Message: `jobaction/restart/${firstJob.job.id} POST - incorrect description "${resApiCall.data.error[0].description}"` });
            return false;
        }


        return result;
    }
}
