import * as util from 'util';
import * as TestBase from './TestBase';
import * as Enums from '../../server/src/shared/Enums';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { TeamSchema } from '../../server/src/api/domain/Team';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { ScriptSchema } from '../../server/src/api/domain/Script';

const script1 = `
import time
print('start')
time.sleep(2)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

const script2 = `
import time
print('start')
time.sleep(2)
print('done')
`;
const script2_b64 = SGUtils.btoa(script2);

const script3 = `
import time
print('start')
time.sleep(2)
print('done')
print('@sgo{"outVal": "val"}')
`;
const script3_b64 = SGUtils.btoa(script3);

let self: Test12;

export default class Test12 extends TestBase.default {
    constructor(testSetup) {
        super('Test12', testSetup);
        this.description = 'Multiple dependencies test with required task/agent tags and routing and runOnAllAgents';
        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 12',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: {
                type: 'job',
                matchCount: 1,
                cntPartialMatch: 0,
                cntFullMatch: 0,
                values: { [SGStrings.status]: Enums.JobStatus.COMPLETED },
            },
        };
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let taskDef1: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task1',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
            requiredTags: { numchucks: 'true' },
            fromRoutes: [],
        };
        taskDef1 = await self.CreateTaskDef(taskDef1, _teamId);

        let taskDef2: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task2',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
            requiredTags: { numchucks: 'true', throwingstar: 'true' },
            fromRoutes: [],
        };
        taskDef2 = await self.CreateTaskDef(taskDef2, _teamId);

        let taskDef3: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task3',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [['Task1', 'ok'], ['Task2']],
        };
        taskDef3 = await self.CreateTaskDef(taskDef3, _teamId);

        let taskDef8: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task8',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [['Task3']],
        };
        taskDef8 = await self.CreateTaskDef(taskDef8, _teamId);

        let taskDef9: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task9',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [['Task8']],
        };
        taskDef9 = await self.CreateTaskDef(taskDef9, _teamId);

        let taskDef7: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task7',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [['Task1', 'fail']],
        };
        taskDef7 = await self.CreateTaskDef(taskDef7, _teamId);

        let taskDef4: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task4',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [],
        };
        taskDef4 = await self.CreateTaskDef(taskDef4, _teamId);

        let taskDef5: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task5',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
            requiredTags: { throwingstar: 'true' },
            fromRoutes: [['Task4']],
        };
        taskDef5 = await self.CreateTaskDef(taskDef5, _teamId);

        let taskDef6: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task6',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [['Task5'], ['Task3']],
        };
        taskDef6 = await self.CreateTaskDef(taskDef6, _teamId);

        let taskDef10: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task10',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS,
            requiredTags: { numchucks: 'true' },
            fromRoutes: [['Task1', 'ok']],
        };
        taskDef10 = await self.CreateTaskDef(taskDef10, _teamId);

        /// Create scripts
        let script_obj1: ScriptSchema = {
            _teamId: _teamId,
            name: 'Script 12.1',
            scriptType: Enums.ScriptType.PYTHON,
            code: script1_b64,
            _originalAuthorUserId: this.sgUser.id,
            _lastEditedUserId: this.sgUser.id,
            lastEditedDate: new Date(),
            shadowCopyCode: script1_b64,
        };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);
        let step1: StepDefSchema = {
            _teamId: _teamId,
            _taskDefId: null,
            name: 'step1',
            _scriptId: script_obj1['id'],
            order: 0,
            arguments: '',
        };
        await self.CreateStepDef(Object.assign(step1, { _taskDefId: taskDef1.id }), _teamId, jobDef.id);

        let script_obj2: ScriptSchema = {
            _teamId: _teamId,
            name: 'Script 12.2',
            scriptType: Enums.ScriptType.PYTHON,
            code: script2_b64,
            _originalAuthorUserId: this.sgUser.id,
            _lastEditedUserId: this.sgUser.id,
            lastEditedDate: new Date(),
            shadowCopyCode: script1_b64,
        };
        script_obj2 = await self.CreateScript(script_obj2, _teamId);
        self.scripts.push(script_obj2);
        let step2: StepDefSchema = {
            _teamId: _teamId,
            _taskDefId: null,
            name: 'step1',
            _scriptId: script_obj2['id'],
            order: 0,
            arguments: '',
        };
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef8.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef9.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef4.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef5.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef6.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef10.id }), _teamId, jobDef.id);

        let script_obj3: ScriptSchema = {
            _teamId: _teamId,
            name: 'Script 12.3',
            scriptType: Enums.ScriptType.PYTHON,
            code: script3_b64,
            _originalAuthorUserId: this.sgUser.id,
            _lastEditedUserId: this.sgUser.id,
            lastEditedDate: new Date(),
            shadowCopyCode: script1_b64,
        };
        script_obj3 = await self.CreateScript(script_obj3, _teamId);
        self.scripts.push(script_obj3);
        let step3: StepDefSchema = {
            _teamId: _teamId,
            _taskDefId: null,
            name: 'step1',
            _scriptId: script_obj3['id'],
            order: 0,
            arguments: '',
        };
        await self.CreateStepDef(Object.assign(step3, { _taskDefId: taskDef3.id }), _teamId, jobDef.id);

        taskDef1.expectedValues = {
            type: 'task',
            matchCount: 5,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step1.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            runtimeVars: { [SGStrings.route]: { value: 'ok' } },
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef1);

        taskDef2.expectedValues = {
            type: 'task',
            matchCount: 4,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef2);

        taskDef3.expectedValues = {
            type: 'task',
            matchCount: 5,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step3.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            runtimeVars: { outVal: { sensitive: false, value: 'val' } },
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef3);

        taskDef8.expectedValues = {
            type: 'task',
            matchCount: 4,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef8);

        taskDef9.expectedValues = {
            type: 'task',
            matchCount: 4,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef9);

        taskDef7.expectedValues = {
            type: 'task',
            matchCount: 0,
            cntPartialMatch: 0,
            cntFullMatch: 0,
            tagsMatch: true,
        };
        self.taskDefs.push(taskDef1);

        taskDef4.expectedValues = {
            type: 'task',
            matchCount: 4,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef4);

        taskDef5.expectedValues = {
            type: 'task',
            matchCount: 4,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef5);

        taskDef6.expectedValues = {
            type: 'task',
            matchCount: 4,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef6);

        taskDef10.expectedValues = {
            type: 'task',
            matchCount: 8,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef10);

        // console.log(util.inspect(this, false, 5, true));
    }
}
