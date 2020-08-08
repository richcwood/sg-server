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
print '@kpo{"outVal": "val"}'
`;
const script2_b64 = KikiUtils.btoa(script2);

let self: Test20;


export default class Test20 extends TestBase.default {

    constructor(testSetup) {
        super('Test20', testSetup);
        this.description = 'Run task after period of agent inactivity test';

        this.maxWaitTimeAfterJobComplete = 20000;
        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = { 'name': 'TestOrg20', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10) };
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create job defs
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 20',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);

        let script_obj2: ScriptSchema = {'_orgId': _orgId, 'name': 'Stop instance', 'scriptType': Enums.ScriptType.PYTHON, 'code': script2_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _orgId);
        self.scripts.push(script_obj2);
        let taskDefInactiveAgent: any = { 'name': 'InactiveAgentTask', 'script': { '_id': script_obj2['id'], }, 'arguments': '' };


        let agent = _.filter(self.testSetup.agents, a => a.machineId == 'TestAgent1')[0];
        // const restAPICallRes: any = await this.RestAPICall('job', 'POST', jobDef._orgId, { _jobDefId: jobDef.id });
        await self.testSetup.RestAPICall(`agent/properties/${agent.instanceId}`, 'PUT', _orgId, {}, {'inactiveAgentTask': taskDefInactiveAgent, 'inactivePeriodWaitTime': 15000});
        
        // /// Create agents
        // let agent;
        // agent = {
        //     '_orgId': _orgId,
        //     'machineId': KikiUtils.makeid(),
        //     'ipAddress': '10.10.0.90',
        //     'tags': [],
        //     'numActiveTasks': 0,
        //     'lastHeartbeatTime': new Date().getTime(),
        //     'rmqPassword': org['rmqPassword'],
        //     'inactivePeriodWaitTime': 15000,
        //     'inactiveAgentTask': taskDefInactiveAgent
        // };
        // self.agents.push(agent);

        /// Create job def tasks
        let taskDef: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [] };
        taskDef = await self.CreateTaskDef(taskDef, _orgId);

        /// Create script
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 20', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);
        let step: StepDefSchema = { '_orgId': _orgId, '_taskDefId': taskDef.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': '' };
        step = await self.CreateStepDef(step, _orgId, jobDef.id);

        taskDef.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [KikiStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'runtimeVars': { [KikiStrings.route]: 'ok' },
            'step': [
                { 'name': step.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef);

        taskDefInactiveAgent.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [KikiStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'runtimeVars': { 'outVal': 'val' },
            'step': [
                { 'name': 'Step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        }
        self.taskDefs.push(taskDefInactiveAgent);

        console.log(util.inspect(this, false, 5, true));
    };


    public async CleanupTest(testSetup: any) {
        await super.CleanupTest(testSetup);

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;
        let agent = _.filter(self.testSetup.agents, a => a.machineId == 'TestAgent1')[0];
        await self.testSetup.RestAPICall(`agent/properties/${agent.instanceId}`, 'PUT', _orgId, {}, {'inactiveAgentTask': null, 'inactivePeriodWaitTime': null});
    };
}
