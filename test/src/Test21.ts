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
import sys
print('start')
time.sleep(2)
print('done')
print('@sgo{"route": "ok"}')
sys.exit(1)
`;
const script1_b64 = SGUtils.btoa(script1);

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

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        let agent = _.filter(self.testSetup.agents, (a) => a.machineId == 'TestAgent1')[0];
        // const restAPICallRes: any = await this.RestAPICall('job', 'POST', jobDef._teamId, { _jobDefId: jobDef.id });
        await self.testSetup.RestAPICall(
            `agent/properties/${agent.instanceId}`,
            'PUT',
            _teamId,
            {},
            { handleGeneralTasks: false }
        );

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: `Job 21`,
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: {
                type: 'job',
                matchCount: 1,
                cntPartialMatch: 0,
                cntFullMatch: 0,
                values: { [SGStrings.status]: Enums.JobStatus.FAILED },
            },
        };
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let taskDef1: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task1',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [],
        };
        taskDef1 = await self.CreateTaskDef(taskDef1, _teamId);

        /// Create script
        let script_obj1: ScriptSchema;
        script_obj1 = {
            _teamId: _teamId,
            name: 'Script 21',
            scriptType: Enums.ScriptType.PYTHON,
            code: script1_b64,
            _originalAuthorUserId: this.sgUser.id,
            _lastEditedUserId: this.sgUser.id,
            lastEditedDate: new Date(),
            shadowCopyCode: script1_b64,
        };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);
        let step: StepDefSchema = {
            _teamId: _teamId,
            _taskDefId: taskDef1.id,
            name: 'step1',
            _scriptId: script_obj1['id'],
            order: 0,
            arguments: '',
        };
        step = await self.CreateStepDef(step, _teamId, jobDef.id);

        taskDef1.expectedValues = {
            type: 'task',
            matchCount: 0,
            tagsMatch: true,
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef1);

        // console.log(util.inspect(this, false, 4, true));
    }

    public async CleanupTest(testSetup: any) {
        await super.CleanupTest(testSetup);

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;
        let agent = _.filter(self.testSetup.agents, (a) => a.machineId == 'TestAgent1')[0];
        await self.testSetup.RestAPICall(
            `agent/properties/${agent.instanceId}`,
            'PUT',
            _teamId,
            {},
            { handleGeneralTasks: true }
        );
    }
}
