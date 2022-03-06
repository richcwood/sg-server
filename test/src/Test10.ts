import * as util from 'util';
import * as lodash from 'lodash';
import * as TestBase from './TestBase';
import * as Enums from '../../server/src/shared/Enums';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { TeamSchema } from '../../server/src/api/domain/Team';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { JobSchema } from '../../server/src/api/domain/Job';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { ScriptSchema } from '../../server/src/api/domain/Script';

const script1 = `
import time
print('start')
time.sleep(10)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

const script2 = `
import time
print('start')
time.sleep(10)
print('done')
`;
const script2_b64 = SGUtils.btoa(script2);

const script3 = `
import time
print('start')
time.sleep(10)
print('done')
print('@sgo{"outVal": "val"}')
`;
const script3_b64 = SGUtils.btoa(script3);

const script4 = `
import time
import sys
print('start')
time.sleep(2)
print('done')
sys.exit(1)
`;
const script4_b64 = SGUtils.btoa(script4);

const script5 = `
import time
print('start')
time.sleep(10)
print('@sgo{"outVal": "@sgg("outVal")"}')
print('done')
`;
const script5_b64 = SGUtils.btoa(script5);

let self: Test10;


export default class Test10 extends TestBase.FailedTestBase {

    constructor(testSetup) {
        super('Test10', testSetup);
        this.description = 'Failed job with multiple dependencies with required task/agent tags and routing';
        self = this;
    }


    public async SetupJobRelaunch() {
        let jobName: string = 'Job 10.1';
        let taskName: string = 'Task1_8';
        let stepName: string = 'step1';

        const jobLocal: JobSchema = lodash.filter(self.jobs, x => x.name === jobName)[0];

        let res: any = await this.testSetup.RestAPICall(`task?filter=_jobId==${jobLocal.id},name==${taskName}`, 'GET', jobLocal._teamId)
        const task = res.data.data[0];

        res = await this.testSetup.RestAPICall(`step?filter=_taskId==${task.id},name==${stepName}`, 'GET', jobLocal._teamId)
        const step = res.data.data[0];

        const script_obj2: ScriptSchema = lodash.filter(self.scripts, x => x.name === 'Script 10.2')[0];
        let qryUpdate: any = {};
        qryUpdate[`script.code`] = script_obj2.code;
        qryUpdate[`script.name`] = script_obj2.name;
        qryUpdate[`script.id`] = script_obj2.id;

        res = await this.testSetup.RestAPICall(`step/${step.id}`, 'PUT', jobLocal._teamId, {}, qryUpdate);

        const jobDef: JobDefSchema = lodash.filter(self.jobDefs, x => x.name === jobName)[0];
        const taskDef: TaskDefSchema = lodash.filter(self.taskDefs, x => x.name === taskName && x._jobDefId === jobDef.id)[0];
        const taskDef1_9: TaskDefSchema = lodash.filter(self.taskDefs, x => x.name === 'Task1_9' && x._jobDefId === jobDef.id)[0];

        jobDef.expectedValues = { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } };
        taskDef.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };

        taskDef1_9.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'runtimeVars': { 'outVal': { 'sensitive': false, 'value': 'val' } },
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };

        // console.log(util.inspect(this, false, 4, true));
    };


    public async CreateTest() {
        await super.CreateTest();

        // /// Create team
        // let team: any = { 'name': 'TestTeam10', 'isActive': true, 'rmqPassword': SGUtils.makeid(10) };
        // team = await self.CreateTeam(team);
        // self.teams.push(team);

        // /// Create agents
        // let agent;
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword'] };
        // self.agents.push(agent);
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword'] };
        // self.agents.push(agent);
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.91', 'tags': ['numchucks'], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword'] };
        // self.agents.push(agent);
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.92', 'tags': ['throwingstar'], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword'] };
        // self.agents.push(agent);
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.93', 'tags': ['numchucks', 'throwingstar'], 'numActiveTasks': 1, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword'] };
        // self.agents.push(agent);

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 10.1',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.FAILED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let taskDef1_1: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true'}, 'fromRoutes': [] };
        taskDef1_1 = await self.CreateTaskDef(taskDef1_1, _teamId);

        let taskDef1_2: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_2', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true', 'throwingstar': 'true'}, 'fromRoutes': [] };
        taskDef1_2 = await self.CreateTaskDef(taskDef1_2, _teamId);

        let taskDef1_3: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_3', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1_1', 'ok'], ['Task1_2']] };
        taskDef1_3 = await self.CreateTaskDef(taskDef1_3, _teamId);

        let taskDef1_8: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_8', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1_3']] };
        taskDef1_8 = await self.CreateTaskDef(taskDef1_8, _teamId);

        let taskDef1_9: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_9', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1_8']] };
        taskDef1_9 = await self.CreateTaskDef(taskDef1_9, _teamId);

        let taskDef1_7: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_7', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1_1', 'fail']] };
        taskDef1_7 = await self.CreateTaskDef(taskDef1_7, _teamId);

        let taskDef1_4: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_4', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [] };
        taskDef1_4 = await self.CreateTaskDef(taskDef1_4, _teamId);

        let taskDef1_5: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_5', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'throwingstar': 'true'}, 'fromRoutes': [['Task1_4']] };
        taskDef1_5 = await self.CreateTaskDef(taskDef1_5, _teamId);

        let taskDef1_6: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1_6', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1_5'], ['Task1_3']] };
        taskDef1_6 = await self.CreateTaskDef(taskDef1_6, _teamId);

        jobDef = {
            _teamId: _teamId,
            name: 'Job 10.2',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        let taskDef2_1: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true'}, 'fromRoutes': [] };
        taskDef2_1 = await self.CreateTaskDef(taskDef2_1, _teamId);

        let taskDef2_2: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_2', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true', 'throwingstar': 'true'}, 'fromRoutes': [] };
        taskDef2_2 = await self.CreateTaskDef(taskDef2_2, _teamId);

        let taskDef2_3: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_3', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task2_1', 'ok'], ['Task2_2']] };
        taskDef2_3 = await self.CreateTaskDef(taskDef2_3, _teamId);

        let taskDef2_8: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_8', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task2_3']] };
        taskDef2_8 = await self.CreateTaskDef(taskDef2_8, _teamId);

        let taskDef2_9: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_9', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task2_8']] };
        taskDef2_9 = await self.CreateTaskDef(taskDef2_9, _teamId);

        let taskDef2_7: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_7', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task2_1', 'fail']] };
        taskDef2_7 = await self.CreateTaskDef(taskDef2_7, _teamId);

        let taskDef2_4: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_4', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [] };
        taskDef2_4 = await self.CreateTaskDef(taskDef2_4, _teamId);

        let taskDef2_5: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_5', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'throwingstar': 'true'}, 'fromRoutes': [['Task2_4']] };
        taskDef2_5 = await self.CreateTaskDef(taskDef2_5, _teamId);

        let taskDef2_6: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task2_6', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task2_5'], ['Task2_3']] };
        taskDef2_6 = await self.CreateTaskDef(taskDef2_6, _teamId);

        /// Create scripts
        let script_obj1: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 10.1', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);
        let step1: StepDefSchema = { '_teamId': _teamId, '_taskDefId': null, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step1, { _taskDefId: taskDef1_1.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step1, { _taskDefId: taskDef2_1.id }), _teamId, jobDef.id);

        let script_obj2: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 10.2', 'scriptType': Enums.ScriptType.PYTHON, 'code': script2_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script2_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _teamId);
        self.scripts.push(script_obj2);
        let step2: StepDefSchema = { '_teamId': _teamId, '_taskDefId': null, 'name': 'step1', '_scriptId': script_obj2['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef1_2.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2_2.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef1_4.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2_4.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef1_5.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2_5.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef1_6.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2_6.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef1_7.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2_7.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, { _taskDefId: taskDef2_8.id }), _teamId, jobDef.id);

        let script_obj3: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 10.3', 'scriptType': Enums.ScriptType.PYTHON, 'code': script3_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script3_b64 };
        script_obj3 = await self.CreateScript(script_obj3, _teamId);
        self.scripts.push(script_obj3);
        let step3: StepDefSchema = { '_teamId': _teamId, '_taskDefId': null, 'name': 'step1', '_scriptId': script_obj3['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step3, { _taskDefId: taskDef1_3.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step3, { _taskDefId: taskDef2_3.id }), _teamId, jobDef.id);

        let script_obj4: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 10.4', 'scriptType': Enums.ScriptType.PYTHON, 'code': script4_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script4_b64 };
        script_obj4 = await self.CreateScript(script_obj4, _teamId);
        self.scripts.push(script_obj4);
        let step4: StepDefSchema = { '_teamId': _teamId, '_taskDefId': null, 'name': 'step1', '_scriptId': script_obj4['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step4, { _taskDefId: taskDef1_8.id }), _teamId, jobDef.id);

        let script_obj5: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 10.5', 'scriptType': Enums.ScriptType.PYTHON, 'code': script5_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script5_b64 };
        script_obj5 = await self.CreateScript(script_obj5, _teamId);
        self.scripts.push(script_obj5);
        let step5: StepDefSchema = { '_teamId': _teamId, '_taskDefId': null, 'name': 'step1', '_scriptId': script_obj5['id'], 'order': 0, 'arguments': '' };
        await self.CreateStepDef(Object.assign(step5, { _taskDefId: taskDef1_9.id }), _teamId, jobDef.id);
        await self.CreateStepDef(Object.assign(step5, { _taskDefId: taskDef2_9.id }), _teamId, jobDef.id);

        taskDef1_1.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'runtimeVars': { [SGStrings.route]: { 'value': 'ok' } },
            'step': [
                { 'name': step1.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1_1);

        taskDef1_2.expectedValues = {
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
        self.taskDefs.push(taskDef1_2);

        taskDef1_3.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step3.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'runtimeVars': { 'outVal': { 'sensitive': false, 'value': 'val' } },
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1_3);

        taskDef1_8.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: 22 },
            'step': [
                { 'name': step4.name, 'values': { 'status': Enums.TaskStatus.FAILED, 'stderr': '', 'exitCode': 1 } }
            ],
            'runtimeVars': { [SGStrings.route]: { 'value': 'fail' } },
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1_8);

        taskDef1_9.expectedValues = {
            'type': 'task',
            'matchCount': 0,
            'cntPartialMatch': 0,
            'cntFullMatch': 0,
            'tagsMatch': true
        };
        self.taskDefs.push(taskDef1_9);

        taskDef1_7.expectedValues = {
            'matchCount': 0,
            'cntPartialMatch': 0,
            'cntFullMatch': 0,
            'tagsMatch': true
        };
        self.taskDefs.push(taskDef1_7);

        taskDef1_4.expectedValues = {
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
        self.taskDefs.push(taskDef1_4);

        taskDef1_5.expectedValues = {
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
        self.taskDefs.push(taskDef1_5);

        taskDef1_6.expectedValues = {
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
        self.taskDefs.push(taskDef1_6);

        taskDef2_1.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'runtimeVars': { [SGStrings.route]: { 'value': 'ok' } },
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_1);

        taskDef2_2.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_2);

        taskDef2_3.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'runtimeVars': { 'outVal': { 'sensitive': false, 'value': 'val' } },
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_3);

        taskDef2_8.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_8);


        taskDef2_9.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_9);

        taskDef2_7.expectedValues = {
            'type': 'task',
            'matchCount': 0,
            'cntPartialMatch': 0,
            'cntFullMatch': 0,
            'tagsMatch': true
        };
        self.taskDefs.push(taskDef2_7);

        taskDef2_4.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_4);

        taskDef2_5.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_5);

        taskDef2_6.expectedValues = {
            'type': 'task',
            'matchCount': 4,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': 'step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2_6);

        // console.log(util.inspect(this, false, 4, true));
    };
}