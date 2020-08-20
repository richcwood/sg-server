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
print '@sgo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);

const script3 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@sgo{"outVal": "val"}'
`;
const script3_b64 = SGUtils.btoa(script3);

let self: Test36;


export default class Test36 extends TestBase.default {

    constructor(testSetup) {
        super('Test36', testSetup);
        this.description = 'Basic toRoute test';

        self = this;
    }
    
    public async CreateTest() {
        await super.CreateTest();

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 36',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);
    
        /// Create job def tasks
        let taskDef1: TaskDefSchema = {'_teamId': _teamId, 'name': 'Task1_1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [], 'toRoutes': [['Task1_3', 'ok']]};
        taskDef1 = await self.CreateTaskDef(taskDef1, _teamId);

        let taskDef3: TaskDefSchema = {'_teamId': _teamId, 'name': 'Task1_3', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': []};
        taskDef3 = await self.CreateTaskDef(taskDef3, _teamId);

        /// Create scripts
        let script_obj1: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 36.1', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);            
        let step: StepDefSchema = { '_teamId': _teamId, '_taskDefId': taskDef1.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step = await self.CreateStepDef(step, _teamId, jobDef.id);
 
        let script_obj3: ScriptSchema = {'_teamId': _teamId, 'name': 'Script 36.3', 'scriptType': Enums.ScriptType.PYTHON, 'code': script3_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj3 = await self.CreateScript(script_obj3, _teamId);
        self.scripts.push(script_obj3);    
        let step3: StepDefSchema = {'_teamId': _teamId, '_taskDefId': taskDef3.id, 'name': 'step3', '_scriptId': script_obj3['id'], 'order': 0, 'arguments': ''};
        step3 = await self.CreateStepDef(step3, _teamId, jobDef.id);
 
        taskDef1.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true,
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'runtimeVars': {[SGStrings.route]: 'ok'}, 
            'step': [
                {'name': step.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        // taskDef1 = await self.UpdateTaskDef(taskDef1.id, {expectedValues: taskDef1.expectedValues}, _teamId);
        self.taskDefs.push(taskDef1);

        taskDef3.expectedValues = {
            'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'runtimeVars': {'outVal': 'val'}, 
            'step': [
                {'name': step3.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0
        };
        // taskDef3 = await self.UpdateTaskDef(taskDef3.id, {expectedValues: taskDef3.expectedValues}, _teamId);
        self.taskDefs.push(taskDef3);
    
        console.log(util.inspect(this, false, 5, true));
    };
}
