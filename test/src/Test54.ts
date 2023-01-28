import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import {
    ScriptType,
    JobDefStatus,
    JobStatus,
    TaskDefTarget,
    TaskStatus,
    TaskFailureCode,
} from '../../server/src/shared/Enums';
import * as _ from 'lodash';

const script1 = `
import time
print('start')
time.sleep(5)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test52;
const correlationId = Math.random().toFixed(5).substring(2);

export default class Test52 extends TestBase.WorkflowTestBase {
    constructor(testSetup) {
        super('Test52', testSetup);
        this.description =
            'Multi-task job - no agent for task - downstream tasks should not run - add tag to agent - tasks should now complete';

        self = this;
    }

    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        let agentMachineId: string = self.testSetup.agents[0].machineId;
        let agentId: string;
        resApiCall = await self.testSetup.RestAPICall(
            `agent?filter=machineId==${agentMachineId}&responseFields=id`,
            'GET',
            _teamId,
            null
        );
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', {
                Message: `agent/name/${agentMachineId}?responseFields=id GET returned ${resApiCall.data.statusCode}`,
            });
            return false;
        }
        agentId = resApiCall.data.data[0].id;

        const properties: any = {
            scripts: [
                {
                    name: 'Script 54',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64,
                },
            ],
            jobDefs: [
                {
                    name: 'Job 54',
                    misfireGraceTime: 1,
                    taskDefs: [
                        {
                            name: 'Task 1',
                            requiredTags: { nomatch: 'true' },
                            target: TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 54',
                                },
                            ],
                        },
                        {
                            name: 'Task 2',
                            fromRoutes: [['Task 1', 'ok']],
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 54',
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let job;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, {
            _jobDefId: jobDefs['Job 54'].id,
            correlationId: correlationId,
        });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', {
                Message: `job POST returned ${resApiCall.data.statusCode}`,
                _jobDefId: jobDefs['Job 54'].id,
            });
            return false;
        }

        job = resApiCall.data.data;

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model: {
                _teamId: config.get('sgTestTeam'),
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                id: job.id,
                type: 'Job',
            },
            correlationId: correlationId,
        };
        self.bpMessagesExpected.push(jobStartedBP);

        const task1CreatedBP: any = {
            domainType: 'Task',
            operation: 1,
            model: {
                _teamId: config.get('sgTestTeam'),
                _jobId: job.id,
                source: 1,
                target: TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
                autoRestart: false,
                requiredTags: { nomatch: 'true' },
                name: 'Task 1',
                type: 'Task',
            },
            correlationId: correlationId,
        };
        self.bpMessagesExpected.push(task1CreatedBP);

        const task2CreatedBP: any = {
            domainType: 'Task',
            operation: 1,
            model: {
                _teamId: config.get('sgTestTeam'),
                _jobId: job.id,
                source: 1,
                target: TaskDefTarget.SINGLE_AGENT,
                autoRestart: false,
                name: 'Task 2',
                type: 'Task',
            },
            correlationId: correlationId,
        };
        self.bpMessagesExpected.push(task2CreatedBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        const task1Qry = _.filter(
            self.bpMessages,
            (x) => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == job.id && x.model.name == 'Task 1'
        );
        if (task1Qry.length < 1) {
            throw new Error(`Unable to find Task - {operation: 1, _jobId: ${job.id}, name: "Task 1"}`);
        }
        const task1: any = task1Qry[0].model;

        const task2Qry = _.filter(
            self.bpMessages,
            (x) => x.domainType == 'Task' && x.operation == 1 && x.model._jobId == job.id && x.model.name == 'Task 2'
        );
        if (task1Qry.length < 1) {
            throw new Error(`Unable to find Task - {operation: 1, _jobId: ${job.id}, name: "Task 2"}`);
        }
        const task2: any = task2Qry[0].model;

        const taskResultNoAgentAvailableBP: any = {
            domainType: 'Task',
            operation: 2,
            model: {
                status: TaskStatus.WAITING_FOR_AGENT,
                failureCode: TaskFailureCode.NO_AGENT_AVAILABLE,
                route: '',
                id: task1.id,
                type: 'Task',
            },
        };
        self.bpMessagesExpected.push(taskResultNoAgentAvailableBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        let tags: any = self.testSetup.agents[0]['tags'];
        tags['nomatch'] = 'true';
        resApiCall = await self.testSetup.RestAPICall(`agent/tags/${agentId}`, 'PUT', _teamId, null, { tags: tags });
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', {
                Message: `agent/tags/${agentId} PUT returned ${resApiCall.data.statusCode}`,
                tags,
            });
            return false;
        }

        const taskResultPublished1BP: any = {
            domainType: 'Task',
            operation: 2,
            model: {
                status: TaskStatus.PUBLISHED,
                id: task1.id,
                type: 'Task',
            },
        };
        self.bpMessagesExpected.push(taskResultPublished1BP);

        const taskOutcomeCreatedTask1BP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model: {
                _teamId: _teamId,
                _jobId: job.id,
                _taskId: task1.id,
                source: 1,
                status: TaskStatus.PUBLISHED,
                autoRestart: false,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskOutcomeCreatedTask1BP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        const taskOutcome1Qry = _.filter(
            self.bpMessages,
            (x) =>
                x.domainType == 'TaskOutcome' &&
                x.operation == 1 &&
                x.model._jobId == job.id &&
                x.model._taskId == task1.id
        );
        if (taskOutcome1Qry.length < 1) {
            throw new Error(`Unable to find TaskOutcome - {operation: 1, _jobId: ${job.id}, _taskId: ${task1.id}}`);
        }
        const taskOutcome1: any = taskOutcome1Qry[0].model;

        const taskResultCompleteTask1BP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model: {
                status: TaskStatus.SUCCEEDED,
                route: 'ok',
                id: taskOutcome1.id,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskResultCompleteTask1BP);

        const taskOutcomeCreatedTask2BP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model: {
                _teamId: _teamId,
                _jobId: job.id,
                _taskId: task2.id,
                source: 1,
                status: TaskStatus.PUBLISHED,
                target: TaskDefTarget.SINGLE_AGENT,
                autoRestart: false,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskOutcomeCreatedTask2BP);

        const taskResultPublished2BP: any = {
            domainType: 'Task',
            operation: 2,
            model: {
                status: TaskStatus.PUBLISHED,
                id: task2.id,
                type: 'Task',
            },
        };
        self.bpMessagesExpected.push(taskResultPublished2BP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        const taskOutcome2Qry = _.filter(
            self.bpMessages,
            (x) =>
                x.domainType == 'TaskOutcome' &&
                x.operation == 1 &&
                x.model._jobId == job.id &&
                x.model._taskId == task2.id
        );
        if (taskOutcome2Qry.length < 1) {
            throw new Error(`Unable to find TaskOutcome - {operation: 1, _jobId: ${job.id}, _taskId: ${task2.id}}`);
        }
        const taskOutcome2: any = taskOutcome2Qry[0].model;

        const taskResultCompleteTask2BP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model: {
                status: TaskStatus.SUCCEEDED,
                route: 'ok',
                id: taskOutcome2.id,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskResultCompleteTask2BP);

        const jobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model: {
                status: JobStatus.COMPLETED,
                id: job.id,
                type: 'Job',
            },
        };
        self.bpMessagesExpected.push(jobCompletedBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;
        self.bpMessagesExpected.length = 0;

        tags = self.testSetup.agents[0]['tags'];
        delete tags.nomatch;
        resApiCall = await self.testSetup.RestAPICall(`agent/tags/${agentId}`, 'PUT', _teamId, null, { tags: tags });
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', {
                Message: `agent/tags/${agentId} PUT returned ${resApiCall.data.statusCode}`,
                tags,
            });
            return false;
        }

        return true;
    }
}
