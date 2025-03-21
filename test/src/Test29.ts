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

const script = `
import time
import sys
print('start')
time.sleep(2)
print('@sgo{{"globalParam1": "{0}"}}'.format(sys.argv[1]))
print('done')
`;
const script_b64 = SGUtils.btoa(script);

let self: Test29;

export default class Test29 extends TestBase.default {
    constructor(testSetup) {
        super('Test29', testSetup);
        this.description = 'Parameter as script arg test';

        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 29',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            runtimeVars: { globalParam1: { sensitive: false, value: 'globalParam1_val' } },
            expectedValues: {
                type: 'job',
                matchCount: 1,
                cntPartialMatch: 0,
                cntFullMatch: 0,
                values: { [SGStrings.status]: Enums.JobStatus.COMPLETED },
            },
        };
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let taskDef: TaskDefSchema = {
            _teamId: _teamId,
            name: 'Task1',
            _jobDefId: jobDef.id,
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            requiredTags: {},
            fromRoutes: [],
        };
        taskDef = await self.CreateTaskDef(taskDef, _teamId);

        /// Create scripts
        let script_obj: ScriptSchema = {
            _teamId: _teamId,
            name: 'Script 29',
            scriptType: Enums.ScriptType.PYTHON,
            code: script_b64,
            _originalAuthorUserId: this.sgUser.id,
            _lastEditedUserId: this.sgUser.id,
            lastEditedDate: new Date(),
            shadowCopyCode: script_b64,
        };
        script_obj = await self.CreateScript(script_obj, _teamId);
        self.scripts.push(script_obj);
        let step2: StepDefSchema = {
            _teamId: _teamId,
            _taskDefId: taskDef.id,
            name: 'step2',
            _scriptId: script_obj['id'],
            order: 0,
            arguments: '@sgg("globalParam1")',
        };
        step2 = await self.CreateStepDef(step2, _teamId, jobDef.id);

        taskDef.expectedValues = {
            type: 'task',
            matchCount: 5,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            runtimeVars: { globalParam1: { sensitive: false, value: 'globalParam1_val' } },
            step: [{ name: step2.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        // taskDef2 = await self.UpdateTaskDef(taskDef2.id, {expectedValues: taskDef2.expectedValues}, _teamId);
        self.taskDefs.push(taskDef);

        // console.log(util.inspect(this, false, 4, true));
    }
}
