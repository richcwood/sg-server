import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, JobDefStatus, JobStatus, TaskStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';
import { TaskDefTarget } from '../../server/src/shared/Enums';


const script1 = `
import time
import sys
print('start')
for i in range(1000):
    time.sleep(5)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test49;
const correlationId = Math.random().toFixed(5).substring(2);


export default class Test49 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test49', testSetup);
        this.description = 'Auto restart tasks test - interrupt and automatically restart';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 49',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 49',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            autoRestart: true,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 49'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { _jobDefId: jobDefs['Job 49'].id, correlationId: correlationId });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 49'].id });
            return false;
        }
        const job = resApiCall.data.data;

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                id: job.id,
                type: 'Job'
            },
            correlationId: correlationId
        };
        self.bpMessagesExpected.push(jobStartedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const taskCreatedBP: any = {
            domainType: 'Task',
            operation: 1,
            model:
            {
                status: null,
                autoRestart: true,
                _teamId: config.get('sgTestTeam'),
                _jobId: job.id,
                name: properties.jobDefs[0].taskDefs[0].name,
                target: 1,
                source: 1,
                type: 'Task'
            }
        };
        self.bpMessagesExpected.push(taskCreatedBP);

        const taskOutcomeCreatedBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobId: job.id,
                source: 1,
                status: TaskStatus.PUBLISHED,
                target: TaskDefTarget.SINGLE_AGENT,
                autoRestart: true,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeCreatedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const task = _.filter(self.bpMessages, x => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == job.id);
        if (task.length < 1) {
            throw new Error(`Unable to find Task - {operation: 1, _jobId: ${job.id}}`);
        }

        const taskOutcome = _.filter(self.bpMessages, x => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._taskId == task[0].model.id);
        if (taskOutcome.length < 1) {
            throw new Error(`Unable to find TaskOutcome - {operation: 1, _taskId: ${task[0].model.id}}`);
        }

        resApiCall = await this.testSetup.RestAPICall(`taskoutcomeaction/interrupt/${taskOutcome[0].model.id}`, 'POST', _teamId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `taskoutcomeaction/interrupt/${taskOutcome[0].model.id} POST returned ${resApiCall.data.statusCode}` });
            return false;
        }


        const taskOutcomeInterruptedBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobId: job.id,
                status: TaskStatus.INTERRUPTING,
                target: TaskDefTarget.SINGLE_AGENT,
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeInterruptedBP);

        const stepInterruptedBP: any = {
            domainType: 'StepOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.INTERRUPTED,
                signal: 'SIGTERM',
                runtimeVars: { route: {'value': 'interrupt'} },
                stdout: '',
                stderr: '',
                exitCode: null,
                type: 'StepOutcome'
            }
        };
        self.bpMessagesExpected.push(stepInterruptedBP);

        const taskInterrupted: any = {
            domainType: 'Task',
            operation: 2,
            model:
            {
                runtimeVars: { route: {'value': 'interrupt'} },
                id: task[0].model.id,
                type: 'Task'
            }
        };
        self.bpMessagesExpected.push(taskInterrupted);

        const republishedTaskCreatedBP: any = {
            domainType: 'Task',
            operation: 2,
            model:
            {
                status: TaskStatus.PUBLISHED,
                // autoRestart: true,
                //                attemptedRunAgentIds: ['5f20a331fbab450ed2e8bb1a'],
                // _teamId: config.get('sgTestTeam'),
                // _jobId: job.id,
                // name: 'Task 1',
                // targetAgentId: null,
                // target: TaskDefTarget.SINGLE_AGENT,
                // source: 1,
                type: 'Task'
            }
        };
        self.bpMessagesExpected.push(republishedTaskCreatedBP);

        const taskOutcomeCanceledBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.CANCELLED,
                runtimeVars: { route: {'value': 'interrupt'} },
                route: 'interrupt',
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeCanceledBP);

        const republishedTaskOutcomeCreatedBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobId: job.id,
                _taskId: task[0].model.id,
                source: 1,
                status: TaskStatus.PUBLISHED,
                target: TaskDefTarget.SINGLE_AGENT,
                autoRestart: true,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(republishedTaskOutcomeCreatedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;


        await self.testSetup.RestAPICall(`jobaction/cancel/${job.id}`, 'POST', _teamId, { correlationId: correlationId }, null);

        const jobCompleteBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: JobStatus.COMPLETED,
                id: job.id,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(jobCompleteBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        return true;
    }
}
