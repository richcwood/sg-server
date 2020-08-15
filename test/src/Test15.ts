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

const script1 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);

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

        // /// Create team
        // let team: any = {'name': 'TestTeam15-1', 'isActive': true, 'rmqPassword': SGUtils.makeid(10)};
        // team = await self.CreateTeam(team);
        // self.teams.push(team);

        // /// Create agents
        // let agent;
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword']};
        // self.agents.push(agent);
         
        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job def
        let jobDef1: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 15a',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef1 = await self.CreateJobDef(jobDef1, _teamId);
        self.jobDefs.push(jobDef1);

        /// Create job def tasks
        let taskDef1: TaskDefSchema = {'_teamId': _teamId, 'name': 'Task1', '_jobDefId': jobDef1.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef1 = await self.CreateTaskDef(taskDef1, _teamId);

        /// Create script
        let script_obj1: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 15', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);            
        let step1: StepDefSchema = {'_teamId': _teamId, '_taskDefId': taskDef1.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step1 = await self.CreateStepDef(step1, _teamId, jobDef1.id);

        taskDef1.expectedValues = {
            'type': 'task', 
            'matchType': '>=',
            'matchCount': 20, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'step': [
                {'name': step1.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'runtimeVars': {[SGStrings.route]: 'ok'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1);

        let startDate = new Date(Math.ceil((new Date(new Date().getTime() + (1000 * 30))).getTime() / coeff) * coeff);
        let endDate = new Date(startDate.getTime() + (1000 * 60));

        /// Create schedule
        let schedule = { '_teamId': _teamId, 'name': 'Schedule_1', 'isActive': true, '_jobDefId': jobDef1['id'], 
            'TriggerType': 'cron', 'cron': {'Second': '*/20', 'Start_Date': startDate.toISOString(), 'End_Date': endDate.toISOString()}, 
            'FunctionKwargs': {'_teamId': _teamId, 'targetId': jobDef1['id']} };
        self.schedules.push(schedule);


        // /// Create team
        // team = {'name': 'TestTeam15-2', 'isActive': true, 'rmqPassword': SGUtils.makeid(10)};
        // team = await self.CreateTeam(team);
        // self.teams.push(team);
    
        // /// Create agents
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword']};
        // self.agents.push(agent);

        /// Create job def
        let jobDef2: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 15b',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef2 = await self.CreateJobDef(jobDef2, _teamId);
        self.jobDefs.push(jobDef2);

        /// Create job def tasks
        let taskDef2: TaskDefSchema = {'_teamId': _teamId, 'name': 'Task1', '_jobDefId': jobDef2.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef2 = await self.CreateTaskDef(taskDef2, _teamId);

        /// Create script
        let script_obj2: ScriptSchema = {'_teamId': _teamId, 'name': 'Python Test', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj2 = await self.CreateScript(script_obj2, _teamId);
        self.scripts.push(script_obj2);            
        let step2: StepDefSchema = {'_teamId': _teamId, '_taskDefId': taskDef2.id, 'name': 'step1', '_scriptId': script_obj2['id'], 'order': 0, 'arguments': ''};
        step2 = await self.CreateStepDef(step2, _teamId, jobDef2.id);

        taskDef2.expectedValues = {
            'type': 'task', 
            'matchCount': 20, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'step': [
                {'name': step2.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'runtimeVars': {[SGStrings.route]: 'ok'}, 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef2);
    
        /// Create schedule
        schedule = { '_teamId': _teamId, 'name': 'Schedule_2', 'isActive': true, '_jobDefId': jobDef2['id'], 
            'TriggerType': 'cron', 'cron': {'Second': '*/20', 'Start_Date': startDate.toISOString(), 'End_Date': endDate.toISOString()}, 
            'FunctionKwargs': {'_teamId': _teamId, 'targetId': jobDef2['id']} };
        self.schedules.push(schedule);

        // console.log(util.inspect(self, false, 5, true));
    };
}
