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
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = KikiUtils.btoa(script1);

const coeff = 1000 * 60;

let self: Test14;

export default class Test14 extends TestBase.ScheduledJobTestBase {

    constructor(testSetup) {
        super('Test14', testSetup);
        this.description = 'Recurring scheduled job script test';

        this.maxWaitTime = 135000;
        this.numJobs = 4;
        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = { 'name': 'TestOrg14', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10) };
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword'] };
        // self.agents.push(agent);

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 14',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let taskDef1: TaskDefSchema = { 'name': 'Task1', '_orgId': _orgId, '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [] };
        taskDef1 = await self.CreateTaskDef(taskDef1, _orgId);

        /// Create script
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 14', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);
        let step: StepDefSchema = { '_orgId': _orgId, '_taskDefId': taskDef1.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': '' };
        step = await self.CreateStepDef(step, _orgId, jobDef.id);

        taskDef1.expectedValues = {
            'type': 'task',
            'matchType': '>=',
            'matchCount': 15,
            'tagsMatch': true,
            'values': { [KikiStrings.status]: Enums.TaskStatus.SUCCEEDED },
            'step': [
                { 'name': step.name, 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'runtimeVars': { [KikiStrings.route]: 'ok' },
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.taskDefs.push(taskDef1);

        /// Create schedule
        let startDate = new Date(Math.ceil((new Date(new Date().getTime() + (1000 * 30))).getTime() / coeff) * coeff);
        let endDate = new Date(startDate.getTime() + (1000 * 60));

        let schedule = {
            '_orgId': _orgId, 'name': 'Schedule_1', 'isActive': true, '_jobDefId': jobDef['id'], 
            'TriggerType': 'cron', 'cron': { 'Second': '*/20', 'Start_Date': startDate.toISOString(), 'End_Date': endDate.toISOString() },
            'FunctionKwargs': { '_orgId': _orgId, 'targetId': jobDef['id'] }
        };
        self.schedules.push(schedule);

        // console.log(util.inspect(this, false, 4, true));
    };
}
