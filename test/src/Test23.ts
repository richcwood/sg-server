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
from datetime import datetime
import sys
print 'start'
time.sleep(30)
print 'done'
print '@sgo{"route": "ok"}'
for i in range(10):
  print i, datetime.now().strftime('%H:%M:%S')
  sys.stdout.flush()
  time.sleep(.5)
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test23;


export default class Test23 extends TestBase.default {

    constructor(testSetup) {
        super('Test23', testSetup);
        this.description = 'Stdout redirect to file test';

        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        // /// Create team
        // let team: any = {'name': 'TestTeam23', 'isActive': true, 'rmqPassword': SGUtils.makeid(10)};
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
            name: 'Job 23',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        let taskDef: TaskDefSchema = {'_teamId': _teamId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef = await self.CreateTaskDef(taskDef, _teamId);

        /// Create script
        let script_obj1: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 23', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);            
        let step: StepDefSchema = { '_teamId': _teamId, '_taskDefId': taskDef.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': 'hello'};
        step = await self.CreateStepDef(step, _teamId, jobDef.id);
    
        /// Create job def tasks
        taskDef.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'runtimeVars': { [SGStrings.route]: { 'value': 'ok' } },
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
