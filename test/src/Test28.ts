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

const script = `
import time
print 'start'
time.sleep(2)
print '@kpo{"globalParam1": "@kpg("globalParam1")"}'
print 'done'
`;
const script_b64 = SGUtils.btoa(script);

let self: Test28;


export default class Test28 extends TestBase.default {

    constructor(testSetup) {
        super('Test28', testSetup);
        this.description = 'Default job def script parameters test';

        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = {'name': 'TestOrg28', 'isActive': true, 'rmqPassword': SGUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { '_orgId': _orgId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);
        
        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 28',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            runtimeVars: { globalParam1: 'globalParam1_val'},
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } }
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);
    
        /// Create job def tasks
        let taskDef: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef = await self.CreateTaskDef(taskDef, _orgId);

        /// Create scripts
        let script_obj: ScriptSchema = {'_orgId': _orgId, 'name': 'Script 28', 'scriptType': Enums.ScriptType.PYTHON, 'code': script_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script_b64 };
        script_obj = await self.CreateScript(script_obj, _orgId);
        self.scripts.push(script_obj);    
        let step2: StepDefSchema = {'_orgId': _orgId, '_taskDefId': taskDef.id, 'name': 'step2', '_scriptId': script_obj['id'], 'order': 0, 'arguments': ''};
        step2 = await self.CreateStepDef(step2, _orgId, jobDef.id);
     
        taskDef.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'runtimeVars': {'globalParam1': 'globalParam1_val'}, 
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        // taskDef2 = await self.UpdateTaskDef(taskDef2.id, {expectedValues: taskDef2.expectedValues}, _orgId);
        self.taskDefs.push(taskDef);

        // console.log(util.inspect(this, false, 4, true));
    };
}
