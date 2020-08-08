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
import * as _ from 'lodash';


const script1 = `
import time
import sys
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
sys.exit(1)
`;
const script1_b64 = KikiUtils.btoa(script1);

let self: Test21;


export default class Test21 extends TestBase.default {

    constructor(testSetup) {
        super('Test21', testSetup);
        this.description = 'Skip general tasks test';

        this.maxWaitTime = 30000;
        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        let agent = _.filter(self.testSetup.agents, a => a.machineId == 'TestAgent1')[0];
        // const restAPICallRes: any = await this.RestAPICall('job', 'POST', jobDef._orgId, { _jobDefId: jobDef.id });
        await self.testSetup.RestAPICall(`agent/properties/${agent.instanceId}`, 'PUT', _orgId, {}, {'handleGeneralTasks': false});

        // /// Create org
        // let org: any = {'name': 'TestOrg21', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent = { 
        //   '_orgId': _orgId, 
        //   'machineId': KikiUtils.makeid(), 
        //   'ipAddress': '10.10.0.90', 
        //   'tags': [], 
        //   'numActiveTasks': 0, 
        //   'lastHeartbeatTime': new Date().getTime(), 
        //   'rmqPassword': org['rmqPassword'],
        //   'handleGeneralTasks': false
        // };
        // self.agents.push(agent);

        /// Create job def
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: `Job 21`,
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.FAILED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);
 
       /// Create job def tasks
       let taskDef1: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
       taskDef1 = await self.CreateTaskDef(taskDef1, _orgId);

        /// Create script
        let script_obj1: ScriptSchema;
        script_obj1 = { '_orgId': _orgId, 'name': 'Script 21', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);
        let step: StepDefSchema = { '_orgId': _orgId, '_taskDefId': taskDef1.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step = await self.CreateStepDef(step, _orgId, jobDef.id);

        taskDef1.expectedValues = {
            'type': 'task', 
            'matchCount': 0, 
            'tagsMatch': true, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1);

        // console.log(util.inspect(this, false, 4, true));
    };


    public async CleanupTest(testSetup: any) {
        await super.CleanupTest(testSetup);

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;
        let agent = _.filter(self.testSetup.agents, a => a.machineId == 'TestAgent1')[0];
        await self.testSetup.RestAPICall(`agent/properties/${agent.instanceId}`, 'PUT', _orgId, {}, {'handleGeneralTasks': true});
    };
}
