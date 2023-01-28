import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { InteractiveConsoleJob } from './TestArtifacts';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { TaskDefTarget, TaskStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';
import { modelOptions } from '@typegoose/typegoose';


const script1 = `
import time
print('start')
time.sleep(10)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test64;


export default class Test64 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test64', testSetup);
        this.description = 'Run multiple jobs with task targeting "all agents with tags" - should round robin across all qualified agents';

        self = this;
    }


    private async RunJob(job, _teamId) {
        return new Promise( async (resolve, reject) => {
            const resApiCall = await this.testSetup.RestAPICall('job', 'POST', _teamId, null, job);
            if (resApiCall.data.statusCode != 201) {
                const msg = `Job POST returned ${resApiCall.data.statusCode}`;
                self.logger.LogError('Failed', { Message: msg, job });
                reject(msg)
            }
            job.job.id = resApiCall.data.data.id;
            resolve(job);
        });
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        let jobs: any[] = [];
        let taskOutcomeIds: any[] = [];


        for (let i = 0; i < 2; ++i) {
            let job: any = _.cloneDeep(InteractiveConsoleJob);
            job.job.name = 'IC - Test64';
            job.job.tasks[0].target = TaskDefTarget.SINGLE_AGENT_WITH_TAGS;
            job.job.tasks[0].requiredTags = {numchucks: "true"};
            job = await this.RunJob(job, _teamId);
            jobs.push(job);

            const taskCreateBP: any = {
                domainType: 'TaskOutcome',
                operation: 1,
                model:
                {
                    _teamId: config.get('sgTestTeam'),
                    _jobId: job.job.id,
                    source: 1,
                    status: TaskStatus.PUBLISHED,
                    target: TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
                    autoRestart: false,
                    type: 'TaskOutcome'
                }
            };
            self.bpMessagesExpected.push(_.clone(taskCreateBP));
        }

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        for (let i = 0; i < 2; ++i) {
            const job = jobs[i];
            resApiCall = await this.testSetup.RestAPICall(`taskoutcome?filter=_jobId==${job.job.id}&responseFields=id&limit=1`, 'GET', _teamId, null);
            if (resApiCall.data.statusCode != 200) {
                self.logger.LogError('Failed', { Message: `taskoutcome?filter=_jobId==${job.job.id}&responseFields=id&limit=1 GET returned ${resApiCall.data.statusCode}` });
                return false;
            }
            let taskOutcomeId: string = resApiCall.data.data[0].id;
            taskOutcomeIds.push(taskOutcomeId);

            const taskCompleteBP: any = {
                domainType: 'TaskOutcome',
                operation: 2,
                model:
                {
                    id: taskOutcomeId,
                    route: 'ok',
                    status: 20,
                    type: 'TaskOutcome'
                }
            };
            self.bpMessagesExpected.push(taskCompleteBP);
        }

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;

        let taskAgents: any[] = [];
        for (let i = 0; i < 2; ++i) {
            const taskOutcomeId = taskOutcomeIds[i];
            const taskOutcome = _.filter(self.bpMessages, x => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model.id == taskOutcomeId);
            if (taskOutcome.length < 1) {
                throw new Error(`Unable to find TaskOutcome - {operation: 1, _taskId: ${taskOutcomeId}}`);
            }

            const agentId = taskOutcome[0].model._agentId;
            if (taskAgents.includes(agentId))
                throw new Error(`Agent ${agentId} executed multiple tasks, should only have executed one`);

            taskAgents.push(agentId);
        }

        return result;
    }
}
