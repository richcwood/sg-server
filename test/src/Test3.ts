import * as util from 'util';
import * as TestBase from './TestBase';
import * as Enums from '../../server/src/shared/Enums';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { OrgSchema } from '../../server/src/api/domain/Org';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { ScriptSchema } from '../../server/src/api/domain/Script';

const script1 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);

const script2 = `
import time
print 'start'
time.sleep(2)
print 'done'
`;
const script2_b64 = SGUtils.btoa(script2);

const script3 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"outVal": "val"}'
`;
const script3_b64 = SGUtils.btoa(script3);

let self: Test3;


export default class Test3 extends TestBase.default {

    constructor(testSetup) {
        super('Test3', testSetup);
        this.description = 'Multiple dependencies test with required task/agent tags and routing';
        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 3',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let taskDef1: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true'}, 'fromRoutes': [] };
        taskDef1 = await self.CreateTaskDef(taskDef1, _orgId);

        let taskDef2: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task2', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true', 'throwingstar': 'true'}, 'fromRoutes': [] };
        taskDef2 = await self.CreateTaskDef(taskDef2, _orgId);

        let taskDef3: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task3', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1'], ['Task2', '']] };
        taskDef3 = await self.CreateTaskDef(taskDef3, _orgId);

        let taskDef8: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task8', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task3']] };
        taskDef8 = await self.CreateTaskDef(taskDef8, _orgId);

        let taskDef9: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task9', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task8']] };
        taskDef9 = await self.CreateTaskDef(taskDef9, _orgId);

        let taskDef7: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task7', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1', 'fail']] };
        taskDef7 = await self.CreateTaskDef(taskDef7, _orgId);

        let taskDef4: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task4', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [] };
        taskDef4 = await self.CreateTaskDef(taskDef4, _orgId);

        let taskDef5: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task5', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'throwingstar': 'true'}, 'fromRoutes': [['Task4']] };
        taskDef5 = await self.CreateTaskDef(taskDef5, _orgId);

        let taskDef6: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task6', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task5'], ['Task3']] };
        taskDef6 = await self.CreateTaskDef(taskDef6, _orgId);


        /// Create scripts
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 3.1', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);
        let step1: StepDefSchema = { '_orgId': _orgId, '_taskDefId': '', 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step1, { _taskDefId: taskDef1.id }), _orgId, jobDef.id);

        let script_obj2: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 3.2', 'scriptType': Enums.ScriptType.PYTHON, 'code': script2_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _orgId);
        self.scripts.push(script_obj2);
        let step2: StepDefSchema = { '_orgId': _orgId, '_taskDefId': '', 'name': 'step2', '_scriptId': script_obj2['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2.id }), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef8.id }), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef9.id }), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef4.id }), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef5.id }), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef6.id }), _orgId, jobDef.id);

        let script_obj3: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 3.3', 'scriptType': Enums.ScriptType.PYTHON, 'code': script3_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj3 = await self.CreateScript(script_obj3, _orgId);
        self.scripts.push(script_obj3);
        let step3: StepDefSchema = { '_orgId': _orgId, '_taskDefId': '', 'name': 'step3', '_scriptId': script_obj3['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step3, { _taskDefId: taskDef3.id }), _orgId, jobDef.id);

        taskDef1.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'runtimeVars': { [SGStrings.route]: 'ok' },
            'step': [
                { 'name': step1.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef1 = await self.UpdateTaskDef(taskDef1.id, {_jobDefId: jobDef.id, expectedValues: taskDef1.expectedValues}, _orgId);
        self.taskDefs.push(taskDef1);

        taskDef2.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step2.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef2 = await self.UpdateTaskDef(taskDef2.id, {_jobDefId: jobDef.id, expectedValues: taskDef2.expectedValues}, _orgId);
        self.taskDefs.push(taskDef2);

        taskDef3.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'runtimeVars': { 'outVal': 'val' },
            'step': [
                { 'name': step3.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef3 = await self.UpdateTaskDef(taskDef3.id, {_jobDefId: jobDef.id, expectedValues: taskDef3.expectedValues}, _orgId);
        self.taskDefs.push(taskDef3);

        taskDef8.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step2.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef8 = await self.UpdateTaskDef(taskDef8.id, {_jobDefId: jobDef.id, expectedValues: taskDef8.expectedValues}, _orgId);
        self.taskDefs.push(taskDef8);

        taskDef9.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step2.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef9 = await self.UpdateTaskDef(taskDef9.id, {_jobDefId: jobDef.id, expectedValues: taskDef9.expectedValues}, _orgId);
        self.taskDefs.push(taskDef9);

        taskDef7.expectedValues = {
            'type': 'task',
            'matchCount': 0,
            'cntPartialMatch': 0,
            'cntFullMatch': 0,
            'tagsMatch': true
        };
        // taskDef7 = await self.UpdateTaskDef(taskDef7.id, {_jobDefId: jobDef.id, expectedValues: taskDef7.expectedValues}, _orgId);
        self.taskDefs.push(taskDef7);

        taskDef4.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step2.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef4 = await self.UpdateTaskDef(taskDef4.id, {_jobDefId: jobDef.id, expectedValues: taskDef4.expectedValues}, _orgId);
        self.taskDefs.push(taskDef4);

        taskDef5.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step2.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef5 = await self.UpdateTaskDef(taskDef5.id, {_jobDefId: jobDef.id, expectedValues: taskDef5.expectedValues}, _orgId);
        self.taskDefs.push(taskDef5);

        taskDef6.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step2.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        // taskDef6 = await self.UpdateTaskDef(taskDef6.id, {_jobDefId: jobDef.id, expectedValues: taskDef6.expectedValues}, _orgId);
        self.taskDefs.push(taskDef6);

        // let cd = SGUtils.isJobDefCyclical(self.taskDefs);
        // if (Object.keys(cd).length > 0)
        //     throw new Error(`Graph contains cyclic dependency with the following tasks: ${Object.keys(cd).filter((key) => cd[key])}`)

        // console.log(util.inspect(this, false, 5, true));
    };
}
