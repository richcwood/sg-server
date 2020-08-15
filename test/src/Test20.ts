import * as util from 'util';
import * as TestBase from './TestBase';
import * as Enums from '../../server/src/shared/Enums';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { TeamSchema } from '../../server/src/api/domain/Team';
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
const script1_b64 = SGUtils.btoa(script1);

const script2 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"outVal": "val"}'
`;
const script2_b64 = SGUtils.btoa(script2);

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

        // /// Create team
        // let team: any = { 'name': 'TestTeam20', 'isActive': true, 'rmqPassword': SGUtils.makeid(10) };
        // team = await self.CreateTeam(team);
        // self.teams.push(team);

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job defs
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 20',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        let script_obj2: ScriptSchema = {'_teamId': _teamId, 'name': 'Stop instance', 'scriptType': Enums.ScriptType.PYTHON, 'code': script2_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _teamId);
        self.scripts.push(script_obj2);
        let taskDefInactiveAgent: any = { 'name': 'InactiveAgentTask', 'script': { '_id': script_obj2['id'], }, 'arguments': '' };


        let agent = _.filter(self.testSetup.agents, a => a.machineId == 'TestAgent1')[0];
        // const restAPICallRes: any = await this.RestAPICall('job', 'POST', jobDef._teamId, { _jobDefId: jobDef.id });
        await self.testSetup.RestAPICall(`agent/properties/${agent.instanceId}`, 'PUT', _teamId, {}, {'inactiveAgentTask': taskDefInactiveAgent, 'inactivePeriodWaitTime': 15000});
        
        // /// Create agents
        // let agent;
        // agent = {
        //     '_teamId': _teamId,
        //     'machineId': SGUtils.makeid(),
        //     'ipAddress': '10.10.0.90',
        //     'tags': [],
        //     'numActiveTasks': 0,
        //     'lastHeartbeatTime': new Date().getTime(),
        //     'rmqPassword': team['rmqPassword'],
        //     'inactivePeriodWaitTime': 15000,
        //     'inactiveAgentTask': taskDefInactiveAgent
        // };
        // self.agents.push(agent);

        /// Create job def tasks
        let taskDef: TaskDefSchema = { '_teamId': _teamId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [] };
        taskDef = await self.CreateTaskDef(taskDef, _teamId);

        /// Create script
        let script_obj1: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 20', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);
        let step: StepDefSchema = { '_teamId': _teamId, '_taskDefId': taskDef.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': '' };
        step = await self.CreateStepDef(step, _teamId, jobDef.id);

        taskDef.expectedValues = {
            'type': 'task',
            'matchCount': 5,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'runtimeVars': { [SGStrings.route]: 'ok' },
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
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
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

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;
        let agent = _.filter(self.testSetup.agents, a => a.machineId == 'TestAgent1')[0];
        await self.testSetup.RestAPICall(`agent/properties/${agent.instanceId}`, 'PUT', _teamId, {}, {'inactiveAgentTask': null, 'inactivePeriodWaitTime': null});
    };
}
