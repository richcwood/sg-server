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

const script1 = `#!/usr/bin/perl
use feature qw(say);
say 'start';
sleep(5);
say 'done';
say '@sgo{"route": "ok"}';
`;

const script1_b64 = SGUtils.btoa(script1);

let self: Test27;

export default class Test27 extends TestBase.default {
    constructor(testSetup) {
        super('Test27', testSetup);
        this.description = 'Shell script running perl script test';

        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 27',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
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
            name: 'Script 27',
            scriptType: Enums.ScriptType.SH,
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
            matchCount: 5,
            tagsMatch: true,
            values: { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED },
            runtimeVars: { [SGStrings.route]: { value: 'ok' } },
            step: [{ name: step.name, values: { status: Enums.TaskStatus.SUCCEEDED, stderr: '', exitCode: 0 } }],
            cntPartialMatch: 0,
            cntFullMatch: 0,
        };
        self.taskDefs.push(taskDef1);

        // console.log(util.inspect(this, false, 5, true));
    }
}
