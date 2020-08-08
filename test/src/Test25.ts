import * as util from 'util';
import * as TestBase from './TestBase';
import * as Enums from '../../server/src/shared/Enums';
import { KikiUtils } from '../../server/src/shared/KikiUtils';
import { KikiStrings } from '../../server/src/shared/KikiStrings';
import { OrgSchema } from '../../server/src/api/domain/Org';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { ScriptSchema } from '../../server/src/api/domain/Script';
import { JobSchema } from '../../server/src/api/domain/Job';



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
print '@kpo{"globalParam1": "@kpg("globalParam1")"}'
print 'done'
`;
const script2_b64 = KikiUtils.btoa(script2);

let self: Test25;


export default class Test25 extends TestBase.default {

    constructor(testSetup) {
        super('Test25', testSetup);
        this.description = 'Parameters passed to job def test';

        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = {'name': 'TestOrg25', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);
        
        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 25',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);
    
        /// Create job def tasks
        let taskDef1: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef1 = await self.CreateTaskDef(taskDef1, _orgId);

        let taskDef2: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task2', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [['Task1', 'ok']]};
        taskDef2 = await self.CreateTaskDef(taskDef2, _orgId);

        /// Create scripts
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 25.1', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);    
        let step1: StepDefSchema = {'_orgId': _orgId, '_taskDefId': taskDef1.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step1 = await self.CreateStepDef(step1, _orgId, jobDef.id);
 
        let script_obj2: ScriptSchema = {'_orgId': _orgId, 'name': 'Script 25.2', 'scriptType': Enums.ScriptType.PYTHON, 'code': script2_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _orgId);
        self.scripts.push(script_obj2);    
        let step2: StepDefSchema = {'_orgId': _orgId, '_taskDefId': taskDef2.id, 'name': 'step2', '_scriptId': script_obj2['id'], 'order': 0, 'arguments': ''};
        step2 = await self.CreateStepDef(step2, _orgId, jobDef.id);
     
        taskDef1.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'step': [
                {'name': step1.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'runtimeVars': {[KikiStrings.route]: 'ok'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };    
        // taskDef1 = await self.UpdateTaskDef(taskDef1.id, {expectedValues: taskDef1.expectedValues}, _orgId);
        self.taskDefs.push(taskDef1);
        
        taskDef2.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'runtimeVars': {'globalParam1': 'globalParam1_val'}, 
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        // taskDef2 = await self.UpdateTaskDef(taskDef2.id, {expectedValues: taskDef2.expectedValues}, _orgId);
        self.taskDefs.push(taskDef2);

        // console.log(util.inspect(this, false, 4, true));
    };


    public async RunTest() {
        self.logger.LogDebug(`Running test for \"${self.description}\"`, {});

        let job: JobSchema;
        for (let i = 0; i < self.jobDefs.length; i++) {
            const jobDef = self.jobDefs[i];
            const restAPICallRes: any = await this.testSetup.RestAPICall('job', 'POST', jobDef._orgId, {_jobDefId: jobDef.id}, {runtimeVars: {globalParam1: 'globalParam1_val'}});
            job = restAPICallRes.data.data;

            // self.jobs.push(job);
        }

        return await self.WaitForTestToComplete();
    }
}
