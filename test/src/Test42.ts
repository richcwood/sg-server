import * as config from 'config';
import * as TestBase from './TestBase';
import { KikiUtils } from '../../server/src/shared/KikiUtils';
import { ScriptType, JobDefStatus, JobStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
import sys
print 'start'
time.sleep(5)
print 'done'
sys.exit(1)
`;
const script1_b64 = KikiUtils.btoa(script1);


let self: Test42;


export default class Test42 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test42', testSetup);
        this.description = 'Pause on failed job test - cancel job to resume';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _orgId: string = config.get('sgTestOrg');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 42',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 42',
                    pauseOnFailedJob: true,
                    taskDefs: [
                        {
                            name: 'Task 1',
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 42'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let job;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _orgId, { _jobDefId: jobDefs['Job 42'].id });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 42'].id });
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

        const jobDefPausedBP: any = {
            domainType: 'JobDef',
            operation: 2,
            model:
            {
                status: JobDefStatus.PAUSED,
                id: jobDefs[properties.jobDefs[0].name].id,
                type: 'JobDef'
            }
        };
        self.bpMessagesExpected.push(jobDefPausedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        resApiCall = await this.testSetup.RestAPICall(`jobaction/cancel/${job.id}`, 'POST', _orgId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `jobaction/cancel/${job.id} POST returned ${resApiCall.data.statusCode}` });
            return false;
        }

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
