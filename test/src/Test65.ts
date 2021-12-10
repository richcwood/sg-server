import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, JobDefStatus, TaskStatus, TaskDefTarget } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
print 'start'
time.sleep(5)
print 'done'
print '@sgg("sensitiveRuntimeVar")'
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test65;


export default class Test65 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test65', testSetup);
        this.description = 'Sensitive runtime variable test';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 65',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 65',
                    coalesce: true,
                    maxInstances: 1,
                    status: JobDefStatus.PAUSED,
                    runtimeVars: {
                        'sensitiveRuntimeVar': { 'value': 'sensitive_value', 'sensitive': true }
                    },
                    taskDefs: [
                        {
                            name: 'Task 1',
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 65'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let startedJobId;
        let job: any;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { _jobDefId: jobDefs['Job 65'].id });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 65'].id });
            return false;
        }

        job = resApiCall.data.data;
        startedJobId = job.id;

        resApiCall = await this.testSetup.RestAPICall(`jobdef/${jobDefs['Job 65'].id}`, 'PUT', _teamId, null, { status: JobDefStatus.RUNNING });

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model:
            {
                _teamId: _teamId,
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                id: startedJobId,
                type: 'Job',
                runtimeVars: {
                    sensitiveRuntimeVar: {
                        value: "sensitive_value",
                        sensitive: true
                    }
                }
            }
        }
        self.bpMessagesExpected.push(jobStartedBP);

        const taskCreateBP: any = {
            domainType: 'Task',
            operation: 1,
            model: {
                status: null,
                autoRestart: false,
                _teamId: _teamId,
                _jobId: job.id,
                name: properties.jobDefs[0].taskDefs[0].name,
                target: TaskDefTarget.SINGLE_AGENT,
                source: 1,
                type: 'Task'
            }
        };
        self.bpMessagesExpected.push(taskCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const task = _.filter(self.bpMessages, x => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == job.id);

        const taskOutcomeCreateBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model:
            {
                _teamId: _teamId,
                _jobId: job.id,
                source: 1,
                status: 10,
                target: TaskDefTarget.SINGLE_AGENT,
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
                runtimeVars: {
                    sensitiveRuntimeVar: {
                        value: "sensitive_value",
                        sensitive: true
                    }
                },
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeCompletedBP);

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
        self.bpMessagesExpected.push(jobCompletedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;

        return true;
    }
}
