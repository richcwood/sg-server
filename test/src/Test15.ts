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

const script1 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = KikiUtils.btoa(script1);

const coeff = 1000 * 60;

let self: Test15;

export default class Test15 extends TestBase.ScheduledJobTestBase {

    constructor(testSetup) {
        super('Test15', testSetup);
        this.description = 'Multiple recurring scheduled jobs script test';

        this.maxWaitTime = 150000;
        this.numJobs = 4;
        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = {'name': 'TestOrg15-1', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);
         
        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create job def
        let jobDef1: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 15a',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef1 = await self.CreateJobDef(jobDef1, _orgId);
        self.jobDefs.push(jobDef1);

        /// Create job def tasks
        let taskDef1: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef1.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef1 = await self.CreateTaskDef(taskDef1, _orgId);

        /// Create script
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 15', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);            
        let step1: StepDefSchema = {'_orgId': _orgId, '_taskDefId': taskDef1.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step1 = await self.CreateStepDef(step1, _orgId, jobDef1.id);

        taskDef1.expectedValues = {
            'type': 'task', 
            'matchType': '>=',
            'matchCount': 20, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'step': [
                {'name': step1.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'runtimeVars': {[KikiStrings.route]: 'ok'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1);

        let startDate = new Date(Math.ceil((new Date(new Date().getTime() + (1000 * 30))).getTime() / coeff) * coeff);
        let endDate = new Date(startDate.getTime() + (1000 * 60));

        /// Create schedule
        let schedule = { '_orgId': _orgId, 'name': 'Schedule_1', 'isActive': true, '_jobDefId': jobDef1['id'], 
            'TriggerType': 'cron', 'cron': {'Second': '*/20', 'Start_Date': startDate.toISOString(), 'End_Date': endDate.toISOString()}, 
            'FunctionKwargs': {'_orgId': _orgId, 'targetId': jobDef1['id']} };
        self.schedules.push(schedule);


        // /// Create org
        // org = {'name': 'TestOrg15-2', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);
    
        // /// Create agents
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);

        /// Create job def
        let jobDef2: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 15b',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef2 = await self.CreateJobDef(jobDef2, _orgId);
        self.jobDefs.push(jobDef2);

        /// Create job def tasks
        let taskDef2: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef2.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef2 = await self.CreateTaskDef(taskDef2, _orgId);

        /// Create script
        let script_obj2: ScriptSchema = {'_orgId': _orgId, 'name': 'Python Test', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _orgId);
        self.scripts.push(script_obj2);            
        let step2: StepDefSchema = {'_orgId': _orgId, '_taskDefId': taskDef2.id, 'name': 'step1', '_scriptId': script_obj2['id'], 'order': 0, 'arguments': ''};
        step2 = await self.CreateStepDef(step2, _orgId, jobDef2.id);

        taskDef2.expectedValues = {
            'type': 'task', 
            'matchCount': 20, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'runtimeVars': {[KikiStrings.route]: 'ok'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2);
    
        /// Create schedule
        schedule = { '_orgId': _orgId, 'name': 'Schedule_2', 'isActive': true, '_jobDefId': jobDef2['id'], 
            'TriggerType': 'cron', 'cron': {'Second': '*/20', 'Start_Date': startDate.toISOString(), 'End_Date': endDate.toISOString()}, 
            'FunctionKwargs': {'_orgId': _orgId, 'targetId': jobDef2['id']} };
        self.schedules.push(schedule);

        // console.log(util.inspect(self, false, 5, true));
    };
}
