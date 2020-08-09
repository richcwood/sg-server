import * as util from 'util';
import * as lodash from 'lodash';
import * as TestBase from './TestBase';
import * as Enums from '../../server/src/shared/Enums';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { OrgSchema } from '../../server/src/api/domain/Org';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { JobSchema } from '../../server/src/api/domain/Job';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { ScriptSchema } from '../../server/src/api/domain/Script';
import { TaskStatus } from '../../server/dist/shared/Enums';


const script1 = `
import time
import sys
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
sys.exit(1)
`;
const script1_b64 = SGUtils.btoa(script1);

const script2 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script2_b64 = SGUtils.btoa(script2);

let self: Test8;


export default class Test8 extends TestBase.FailedTestBase {

    constructor(testSetup) {
        super('Test8', testSetup);
        this.description = 'Basic relaunch failed job';

        self = this;
    }
    
    public async SetupJobRelaunch() {
        let jobName: string = 'Job 8';
        let taskName: string = 'Task1';
        let stepName: string = 'step1';

        const jobLocal: JobSchema = lodash.filter(self.jobs, x => x.name === jobName)[0];

        let res: any = await this.testSetup.RestAPICall(`task?filter=_jobId==${jobLocal.id},name==${taskName}`, 'GET', jobLocal._orgId)
        const task = res.data.data[0];

        res = await this.testSetup.RestAPICall(`step?filter=_taskId==${task.id},name==${stepName}`, 'GET', jobLocal._orgId)
        const step = res.data.data[0];

        let script_obj2: ScriptSchema = {'_orgId': jobLocal._orgId, 'name': 'Script 8.2', 'scriptType': Enums.ScriptType.PYTHON, 'code': script2_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script2_b64 };
        script_obj2 = await self.CreateScript(script_obj2, jobLocal._orgId);
        self.scripts.push(script_obj2);            

        let qryUpdate: any = {};
        qryUpdate[`script.code`] = script_obj2.code;
        qryUpdate[`script.name`] = script_obj2.name;
        qryUpdate[`script.id`] = script_obj2.id;

        res = await this.testSetup.RestAPICall(`step/${step.id}`, 'PUT', jobLocal._orgId, {}, qryUpdate);

        const jobDef: JobDefSchema = lodash.filter(self.jobDefs, x => x.name === jobName)[0];
        const taskDef: TaskDefSchema = lodash.filter(self.taskDefs, x => x.name === taskName && x._jobDefId === jobDef.id)[0];

        jobDef.expectedValues = {'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0,'values': {[SGStrings.status]: Enums.JobStatus.COMPLETED}};
        taskDef.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true,
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'runtimeVars': {[SGStrings.route]: 'ok'}, 
            'step': [
                {'name': 'step1', 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
    
        // console.log(util.inspect(this, false, 4, true));
    };
    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = {'name': 'TestOrg8', 'isActive': true, 'rmqPassword': SGUtils.makeid(10)};
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
            name: 'Job 8',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.FAILED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);
    
        /// Create job def tasks
        let taskDef: TaskDefSchema = {'_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef = await self.CreateTaskDef(taskDef, _orgId);

        /// Create scripts
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 8.1', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);            
        let step: StepDefSchema = { '_orgId': _orgId, '_taskDefId': taskDef.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step = await self.CreateStepDef(step, _orgId, jobDef.id);

        taskDef.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.FAILED},
            'runtimeVars': {[SGStrings.route]: 'fail'}, 
            'step': [
                {'name': step.name, 'values': {'status': Enums.TaskStatus.FAILED, 'stderr': '', 'exitCode': 1}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef);
    
        // console.log(util.inspect(this, false, 4, true));
    };
}
