import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, JobDefStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
print 'start'
time.sleep(5)
print 'done'
print '@sgo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test41;


export default class Test41 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test41', testSetup);
        this.description = 'Coalesce test';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 41',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 41',
                    coalesce: true,
                    maxInstances: 1,
                    status: JobDefStatus.PAUSED,
                    taskDefs: [
                        {
                            name: 'Task 1',
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 41'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let startedJobId;
        for (let i = 0; i < 5; i++) {
            resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { _jobDefId: jobDefs['Job 41'].id });
            if (resApiCall.data.statusCode != 201) {
                self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 41'].id });
                return false;
            }

            if (i == 4)
                startedJobId = resApiCall.data.data.id;
        }

        resApiCall = await this.testSetup.RestAPICall(`jobdef/${jobDefs['Job 41'].id}`, 'PUT', _teamId, null, { status: JobDefStatus.RUNNING });

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 4,
                name: properties.jobDefs[0].name,
                status: 0,
                id: startedJobId,
                type: 'Job'
            }
        }
        self.bpMessagesExpected.push(jobStartedBP);

        const jobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: 20,
                id: startedJobId,
                type: 'Job'
            }
        };
        for (let i = 0; i < 2; i++)
            self.bpMessagesExpected.push(_.clone(jobCompletedBP));

        const jobSkippedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: 23,
                error: 'Job skipped due to coalesce',
                type: 'Job'
            }
        };
        for (let i = 0; i < 3; i++)
            self.bpMessagesExpected.push(_.clone(jobSkippedBP));

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;

        return true;
    }
}
