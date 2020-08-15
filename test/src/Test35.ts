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
import { TeamVariableSchema } from '../../server/src/api/domain/TeamVariable';

const script1 = `
import time
print 'start'
time.sleep(2)
print '@kpo{"globalParam1": "@kpg("globalParam1")"}'
print 'done'
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test35;


export default class Test35 extends TestBase.default {

    constructor(testSetup) {
        super('Test35', testSetup);
        this.description = 'Team runtime variable parameter test';

        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create team
        // let team: any = {'name': 'TestTeam5', 'isActive': true, 'rmqPassword': SGUtils.makeid(10)};
        // team = await self.CreateTeam(team);
        // self.teams.push(team);

        // /// Create agents
        // let agent;
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword']};
        // self.agents.push(agent);
        
        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 35',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        /// Create team variable
        let teamVar: TeamVariableSchema = {
            _teamId,
            name: 'globalParam1',
            value: 'globalParam1_val'
        }
        teamVar = await self.CreateTeamVariable(teamVar, _teamId);
    
        /// Create job def tasks
        let taskDef1: TaskDefSchema = {'_teamId': _teamId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef1 = await self.CreateTaskDef(taskDef1, _teamId);

        /// Create scripts
        let script_obj1: ScriptSchema = {'_teamId': _teamId, 'name': 'Script 35', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);    
        let step1: StepDefSchema = {'_teamId': _teamId, '_taskDefId': taskDef1.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step1 = await self.CreateStepDef(step1, _teamId, jobDef.id);
     
        taskDef1.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED},
            'runtimeVars': {'globalParam1': 'globalParam1_val'}, 
            'step': [
                {'name': step1.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        // taskDef2 = await self.UpdateTaskDef(taskDef2.id, {expectedValues: taskDef2.expectedValues}, _teamId);
        self.taskDefs.push(taskDef1);

        // console.log(util.inspect(this, false, 4, true));
    };
}
