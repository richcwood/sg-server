import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, JobDefStatus, JobStatus, TaskStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';
import { TaskDefTarget } from '../../server/src/shared/Enums';


const script1 = `
import time
import sys
print 'start'
for i in range(1000):
    time.sleep(5)
print 'done'
print '@sgo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test50;
const correlationId = Math.random().toFixed(5).substring(2);


export default class Test50 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test50', testSetup);
        this.description = 'Auto restart tasks test - cancel';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 50',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 50',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            autoRestart: true,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 50'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { _jobDefId: jobDefs['Job 50'].id, correlationId: correlationId });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 50'].id });
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
                target: TaskDefTarget.SINGLE_AGENT,
                source: 1,
                type: 'Task'
            },
            correlationId: correlationId
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
                status: TaskStatus.RUNNING,
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

        resApiCall = await this.testSetup.RestAPICall(`taskoutcomeaction/cancel/${taskOutcome[0].model.id}`, 'POST', _teamId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `taskoutcomeaction/cancel/${taskOutcome[0].model.id} POST returned ${resApiCall.data.statusCode}` });
            return false;
        }


        const taskOutcomeInterruptedBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobId: job.id,
                status: TaskStatus.CANCELING,
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
                runtimeVars: { route: 'interrupt' },
                stdout: '',
                stderr: '',
                exitCode: null,
                type: 'StepOutcome'
            }
        };
        self.bpMessagesExpected.push(stepInterruptedBP);

        const taskInterruptedBP: any = {
            domainType: 'Task',
            operation: 2,
            model:
            {
                runtimeVars: { route: 'interrupt' },
                id: task[0].model.id,
                type: 'Task'
            }
        };
        self.bpMessagesExpected.push(taskInterruptedBP);

        const jobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: JobStatus.COMPLETED,
                id: job.id,
                type: 'Job'
            },
            correlationId: null
        };
        self.bpMessagesExpected.push(jobCompletedBP);

        const taskOutcomeCanceledBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.CANCELLED,
                runtimeVars: { route: 'interrupt' },
                route: 'interrupt',
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeCanceledBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;


        return true;
    }
}
