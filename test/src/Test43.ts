import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, JobDefStatus, JobStatus, TaskStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
import sys
print 'start'
time.sleep(5)
print 'done'
sys.exit(1)
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test43;


export default class Test43 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test43', testSetup);
        this.description = 'Pause on failed job test - cancel task outcome to resume';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _orgId: string = config.get('sgTestOrg');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 43',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 43',
                    pauseOnFailedJob: true,
                    taskDefs: [
                        {
                            name: 'Task 1',
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 43'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let job;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _orgId, { _jobDefId: jobDefs['Job 43'].id });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 43'].id });
            return false;
        }

        job = resApiCall.data.data;

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model:
            {
                _orgId: config.get('sgTestOrg'),
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                id: job.id,
                type: 'Job'
            }
        }
        self.bpMessagesExpected.push(jobStartedBP);

        const jobFailedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: JobStatus.FAILED,
                id: job.id,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(jobFailedBP);

        const jobDefPaused: any = {
            domainType: 'JobDef',
            operation: 2,
            model:
            {
                status: JobDefStatus.PAUSED,
                id: jobDefs[properties.jobDefs[0].name].id,
                type: 'JobDef'
            }
        };
        self.bpMessagesExpected.push(jobDefPaused);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const task = _.filter(self.bpMessages, x => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == job.id);
        const taskOutcome = _.filter(self.bpMessages, x => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._taskId == task[0].model.id);

        resApiCall = await this.testSetup.RestAPICall(`taskoutcomeaction/cancel/${taskOutcome[0].model.id}`, 'POST', _orgId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `taskoutcomeaction/cancel/${taskOutcome[0].model.id} POST returned ${resApiCall.data.statusCode}` });
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

        const jobDefRunningBP: any = {
            domainType: 'JobDef',
            operation: 2,
            model:
            {
                status: JobDefStatus.RUNNING,
                id: jobDefs[properties.jobDefs[0].name].id,
                type: 'JobDef'
            }
        };
        self.bpMessagesExpected.push(jobDefRunningBP);

        const jobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: JobStatus.COMPLETED,
                id: job.id,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(jobCompletedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;


        return true;
    }
}
