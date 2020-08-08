import * as util from 'util';
import * as lodash from 'lodash';
import * as TestBase from './TestBase';
import * as Enums from '../../server/src/shared/Enums';
import { KikiUtils } from '../../server/src/shared/KikiUtils';
import { KikiStrings } from '../../server/src/shared/KikiStrings';
import { OrgSchema } from '../../server/src/api/domain/Org';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { JobSchema } from '../../server/src/api/domain/Job';
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
const script1_b64 = KikiUtils.btoa(script1);

const script2 = `
import time
print 'start'
time.sleep(2)
print 'done'
`;
const script2_b64 = KikiUtils.btoa(script2);

const script3 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"outVal": "val"}'
`;
const script3_b64 = KikiUtils.btoa(script3);

const script4 = `
import time
import sys
print 'start'
time.sleep(2)
print 'done'
sys.exit(1)
`;
const script4_b64 = KikiUtils.btoa(script4);

const script5 = `
import time
print 'start'
time.sleep(2)
print '@kpo{"outVal": "@kpg("outVal")"}'
print 'done'
`;
const script5_b64 = KikiUtils.btoa(script5);

let self: Test9;


export default class Test9 extends TestBase.FailedTestBase {

    constructor(testSetup) {
        super('Test9', testSetup);        this.description = 'Failed job with multiple dependencies with required task/agent tags and routing';
        self = this;
    }


    public async SetupJobRelaunch() {
        let jobName: string = 'Job 9';
        let taskName: string = 'Task8';
        let stepName: string = 'step1';

        const jobLocal: JobSchema = lodash.filter(self.jobs, x => x.name === jobName)[0];

        let res: any = await this.testSetup.RestAPICall(`task?filter=_jobId==${jobLocal.id},name==${taskName}`, 'GET', jobLocal._orgId)
        const task = res.data.data[0];

        res = await this.testSetup.RestAPICall(`step?filter=_taskId==${task.id},name==${stepName}`, 'GET', jobLocal._orgId)
        const step = res.data.data[0];

        const script_obj3: ScriptSchema = lodash.filter(self.scripts, x => x.name === 'Script 9.3')[0];
        let qryUpdate: any = {};
        qryUpdate[`script.code`] = script_obj3.code;
        qryUpdate[`script.name`] = script_obj3.name;
        qryUpdate[`script.id`] = script_obj3.id;

        res = await this.testSetup.RestAPICall(`step/${step.id}`, 'PUT', jobLocal._orgId, {}, qryUpdate);

        const jobDef: JobDefSchema = lodash.filter(self.jobDefs, x => x.name === jobName)[0];
        const taskDef: TaskDefSchema = lodash.filter(self.taskDefs, x => x.name === taskName && x._jobDefId === jobDef.id)[0];
        const taskDef9: TaskDefSchema = lodash.filter(self.taskDefs, x => x.name === 'Task9' && x._jobDefId === jobDef.id)[0];

        jobDef.expectedValues = {'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0,'values': {[KikiStrings.status]: Enums.JobStatus.COMPLETED}};
        taskDef.expectedValues = {
            'type': 'task', 
            'matchCount': 4, 
            'tagsMatch': true,
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'step': [
                {'name': 'step1', 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
    
        taskDef9.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'step': [
                {'name': 'step1', 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'runtimeVars': {'outVal': 'val'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };

        // console.log(util.inspect(this, false, 4, true));
    };

    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = {'name': 'TestOrg9', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.91', 'tags': ['numchucks'], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.92', 'tags': ['throwingstar'], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.93', 'tags': ['numchucks', 'throwingstar'], 'numActiveTasks': 1, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 9',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.FAILED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);
    
        /// Create job def tasks
        let taskDef1: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true'}, 'fromRoutes': []};
        taskDef1 = await self.CreateTaskDef(taskDef1, _orgId);

        let taskDef2: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task2', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'numchucks': 'true', 'throwingstar': 'true'}, 'fromRoutes': []};
        taskDef2 = await self.CreateTaskDef(taskDef2, _orgId);

        let taskDef3: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task3', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1', 'ok'], ['Task2']]};
        taskDef3 = await self.CreateTaskDef(taskDef3, _orgId);

        let taskDef8: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task8', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task3']]};
        taskDef8 = await self.CreateTaskDef(taskDef8, _orgId);

        let taskDef9: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task9', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task8']]};
        taskDef9 = await self.CreateTaskDef(taskDef9, _orgId);

        let taskDef7: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task7', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1', 'fail']]};
        taskDef7 = await self.CreateTaskDef(taskDef7, _orgId);

        let taskDef4: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task4', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef4 = await self.CreateTaskDef(taskDef4, _orgId);

        let taskDef5: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task5', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS, 'requiredTags': {'throwingstar': 'true'}, 'fromRoutes': [['Task4']]};
        taskDef5 = await self.CreateTaskDef(taskDef5, _orgId);

        let taskDef6: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task6', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task5'], ['Task3']]};
        taskDef6 = await self.CreateTaskDef(taskDef6, _orgId);
        
        /// Create scripts
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 9.1', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);            
        let step1: StepDefSchema = {'_orgId': _orgId, '_taskDefId': '', 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        await self.CreateStepDef(Object.assign(step1, {_taskDefId: taskDef1.id}), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step1, {_taskDefId: taskDef7.id}), _orgId, jobDef.id);

        let script_obj2: ScriptSchema = {'_orgId': _orgId, 'name': 'Script 9.2', 'scriptType': Enums.ScriptType.PYTHON, 'code': script2_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _orgId);
        self.scripts.push(script_obj2);            
        let step2: StepDefSchema = {'_orgId': _orgId, '_taskDefId': '', 'name': 'step1', '_scriptId': script_obj2['id'], 'order': 0, 'arguments': ''};
        await self.CreateStepDef(Object.assign(step2, {_taskDefId: taskDef2.id}), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, {_taskDefId: taskDef4.id}), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, {_taskDefId: taskDef5.id}), _orgId, jobDef.id);
        await self.CreateStepDef(Object.assign(step2, {_taskDefId: taskDef6.id}), _orgId, jobDef.id);
 
        let script_obj3: ScriptSchema = {'_orgId': _orgId, 'name': 'Script 9.3', 'scriptType': Enums.ScriptType.PYTHON, 'code': script3_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj3 = await self.CreateScript(script_obj3, _orgId);
        self.scripts.push(script_obj3);            
        let step3: StepDefSchema = {'_orgId': _orgId, '_taskDefId': '', 'name': 'step1', '_scriptId': script_obj3['id'], 'order': 0, 'arguments': ''};
        await self.CreateStepDef(Object.assign(step3, {_taskDefId: taskDef3.id}), _orgId, jobDef.id);
 
        let script_obj4: ScriptSchema = {'_orgId': _orgId, 'name': 'Script 9.4', 'scriptType': Enums.ScriptType.PYTHON, 'code': script4_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj4 = await self.CreateScript(script_obj4, _orgId);
        self.scripts.push(script_obj4);            
        let step4: StepDefSchema = {'_orgId': _orgId, '_taskDefId': '', 'name': 'step1', '_scriptId': script_obj4['id'], 'order': 0, 'arguments': ''};
        await self.CreateStepDef(Object.assign(step4, {_taskDefId: taskDef8.id}), _orgId, jobDef.id);

        let script_obj5: ScriptSchema = {'_orgId': _orgId, 'name': 'Script 9.5', 'scriptType': Enums.ScriptType.PYTHON, 'code': script5_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj5 = await self.CreateScript(script_obj5, _orgId);
        self.scripts.push(script_obj5);            
        let step5: StepDefSchema = {'_orgId': _orgId, '_taskDefId': '', 'name': 'step1', '_scriptId': script_obj5['id'], 'order': 0, 'arguments': ''};
        await self.CreateStepDef(Object.assign(step5, {_taskDefId: taskDef9.id}), _orgId, jobDef.id);

        taskDef1.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'runtimeVars': {[KikiStrings.route]: 'ok'}, 
            'step': [
                {'name': step1.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1);

        taskDef2.expectedValues = {
            'type': 'task', 
            'matchCount': 4, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2);

        taskDef3.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'step': [
                {'name': step3.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'runtimeVars': {'outVal': 'val'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef3);

        taskDef8.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: 22}, 
            'step': [
                {'name': step4.name, 'values': {'status': Enums.TaskStatus.FAILED, 'stderr': '', 'exitCode': 1}}
            ], 
            'runtimeVars': {[KikiStrings.route]: 'fail'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef8);

        taskDef9.expectedValues = {
            'type': 'task',
            'matchCount': 0, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0,
            'tagsMatch': true
        };
        self.taskDefs.push(taskDef9);
    
        taskDef7.expectedValues = {
			'matchCount': 0, 
			'cntPartialMatch': 0, 
			'cntFullMatch': 0, 
            'tagsMatch': true 
        };
        self.taskDefs.push(taskDef7);

        taskDef4.expectedValues = {
            'type': 'task', 
            'matchCount': 4, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef4);

        taskDef5.expectedValues = {
            'type': 'task', 
            'matchCount': 4, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef5);

        taskDef6.expectedValues = {
            'type': 'task', 
            'matchCount': 4, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef6);

        // console.log(util.inspect(this, false, 4, true));
    };
}
