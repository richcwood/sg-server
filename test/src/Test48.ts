import * as util from 'util';
import * as config from 'config';
import * as TestBase from './TestBase';
import { InteractiveConsoleJob } from './TestArtifacts';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { TaskDefTarget, TaskStatus, TaskFailureCode } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
import sys
print('start')
for i in range(@sgg("linenum"),50):
    print(i)
    print('@sgo{{"linenum":{}}}'.format(i))
    if i==25:
        print('@sgo{{"linenum":{}}}'.format(i+1))
        sys.exit(-1)
    time.sleep(.5)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test48;


export default class Test48 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test48', testSetup);
        this.description = 'Maintain state with runtime variable after restarting failed task';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        let firstJob: any = _.cloneDeep(InteractiveConsoleJob);
        firstJob.job.name = 'IC - Test48';
        firstJob.job.tasks[0].target = TaskDefTarget.SINGLE_AGENT;
        firstJob.job.tasks[0].steps[0].script.code = script1_b64;
        firstJob.job.runtimeVars = { linenum: {'sensitive': false, 'value': 0} };

        resApiCall = await this.testSetup.RestAPICall('job', 'POST', _teamId, null, firstJob);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `Job POST returned ${resApiCall.data.statusCode}`, firstJob });
            return false;
        }
        firstJob.job.id = resApiCall.data.data.id;

        const taskCreateBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobId: firstJob.job.id,
                source: 1,
                status: 10,
                target: TaskDefTarget.SINGLE_AGENT,
                autoRestart: false,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const taskOutcome = _.filter(self.bpMessages, x => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._jobId == firstJob.job.id);

        const taskOutcomeFailBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.FAILED,
                failureCode: TaskFailureCode.TASK_EXEC_ERROR,
                runtimeVars: { linenum: {'sensitive': false, 'value': 26}, route: {'value': 'fail'} },
                route: 'fail',
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeFailBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        resApiCall = await this.testSetup.RestAPICall(`taskoutcomeaction/restart/${taskOutcome[0].model.id}`, 'POST', _teamId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `taskoutcomeaction/restart/${taskOutcome[0].model.id} POST returned ${resApiCall.data.statusCode}` });
            return false;
        }

        const taskOutcomeCancelBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.CANCELLED,
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeCancelBP);

        const taskOutcomeRestartedCreateBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobId: firstJob.job.id,
                source: 1,
                status: 10,
                target: TaskDefTarget.SINGLE_AGENT,
                autoRestart: false,
                runtimeVars: { linenum: {'sensitive': false, 'value': 26} },
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeRestartedCreateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const taskOutcomeRestarted = _.filter(self.bpMessages, x => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._jobId == firstJob.job.id && x.model.id != taskOutcome[0].model.id);

        const taskOutcomeRestartedCompletedBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model:
            {
                status: TaskStatus.SUCCEEDED,
                runtimeVars: { linenum: {'sensitive': false, 'value': 49}, route: {'value': 'ok'} },
                route: 'ok',
                id: taskOutcomeRestarted[0].model.id,
                type: 'TaskOutcome'
            }
        };
        self.bpMessagesExpected.push(taskOutcomeRestartedCompletedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
            

        return result;
    }
}
