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
time.sleep(10)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = KikiUtils.btoa(script1);

let self: Test17;


export default class Test17 extends TestBase.default {

    constructor(testSetup) {
        super('Test17', testSetup);
        this.description = 'Twenty parallel jobs, one agent';
        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = {'name': 'TestOrg17', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { '_orgId': _orgId, 'machineId': KikiUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword']};
        // self.agents.push(agent);

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        /// Create script
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 17', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);
        let step: StepDefSchema = { '_orgId': _orgId, '_taskDefId': '', 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': '' };

        /// Create job defs
        for (let i = 0; i < 20; i++) {
            let jobDef: JobDefSchema = {
                _orgId: _orgId,
                name: `Job 17-${i.toString()}`,
                createdBy: this.sgUser.id,
                lastRunId: 0,
                dateCreated: new Date(),
                expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
            }
            jobDef = await self.CreateJobDef(jobDef, _orgId);
            self.jobDefs.push(jobDef);

            /// Create job def tasks
            let taskDef1: TaskDefSchema = { '_orgId': _orgId, 'name': 'Task1', '_jobDefId': jobDef.id, 'target': Enums.TaskDefTarget.SINGLE_AGENT, 'requiredTags': {}, 'fromRoutes': [] };
            taskDef1 = await self.CreateTaskDef(taskDef1, _orgId);
            await self.CreateStepDef(Object.assign(step, { _taskDefId: taskDef1.id }), _orgId, jobDef.id);

            taskDef1.expectedValues = {
                'type': 'task',
                'matchCount': 5,
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
        }

        // console.log(util.inspect(this, false, 4, true));
    };
}
