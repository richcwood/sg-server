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
from datetime import datetime
import sys
print 'start'
time.sleep(30)
print 'done'
print '@kpo{"route": "ok"}'
for i in range(10):
  print i, datetime.now().strftime('%H:%M:%S')
  sys.stdout.flush()
  time.sleep(.5)
`;
const script1_b64 = KikiUtils.btoa(script1);

let self: Test23;


export default class Test23 extends TestBase.default {

    constructor(testSetup) {
        super('Test23', testSetup);
        this.description = 'Stdout redirect to file test';

        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = {'name': 'TestOrg23', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
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
            name: 'Job 23',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);

        let taskDef: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef = await self.CreateTaskDef(taskDef, _orgId);

        /// Create script
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 23', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);            
        let step: StepDefSchema = { '_orgId': _orgId, '_taskDefId': taskDef.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': 'hello'};
        step = await self.CreateStepDef(step, _orgId, jobDef.id);
    
        /// Create job def tasks
        taskDef.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'runtimeVars': {[KikiStrings.route]: 'ok'}, 
            'step': [
                { 'name': step.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0} }
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef);

        // console.log(util.inspect(this, false, 5, true));
    };
}
