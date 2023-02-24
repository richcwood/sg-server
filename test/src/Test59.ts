import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import {
    ScriptType,
    TaskDefTarget,
    TaskStatus,
    TaskFailureCode,
    StepStatus,
    JobStatus,
} from '../../server/src/shared/Enums';
import * as _ from 'lodash';

const script1 = `
import requests
import json
import sys
import time


token = ''

def RestAPILogin():
    global token

    url = 'https://console.saasglue.com/login/apiLogin'
    
    headers = {
        'Content-Type': 'application/json'
    }

    data = {
        'accessKeyId': '@sgg("sgAccessKeyId")',
        'accessKeySecret': '@sgg("sgAccessKeySecret")'
    }

    res = requests.post(url=url, headers=headers, data=json.dumps(data))
    if 'status_code' in res and res['status_code'] != 200:
        msg = 'Call to {} returned {} - {}'.format(url, res.status_code, res.text)
        raise Exception(msg)

    token = json.loads(res.text)['config1']


while token == '':
    RestAPILogin()
    if token == '':
        print('API login failed')
        sys.stdout.flush()
        time.sleep(5)
        print('Retrying api login')
        sys.stdout.flush()

print('@sgo{{"sgAuthToken": "{}"}}'.format(token))
print(a)
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test59;

export default class Test59 extends TestBase.WorkflowTestBase {
    constructor(testSetup) {
        super('Test59', testSetup);
        this.description = 'Run python task as lambda with error';

        self = this;
    }

    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        // const sgAdminTeam: string = config.get('sgAdminTeam');
        // const awsLambdaRequiredTags: string = config.get('awsLambdaRequiredTags');
        // const newAgentProperties = { '_teamId': sgAdminTeam, 'machineId': 'AdminAgent', 'ipAddress': '10.10.0.104', 'tags': awsLambdaRequiredTags, 'numActiveTasks': 0, 'lastHeartbeatTime': null, 'rmqPassword': 'lpUs8Cnsju' };
        // const newAgent = await self.testSetup.InitAgent(newAgentProperties);

        const properties: any = {
            scripts: [
                {
                    name: 'Script 59',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64,
                },
            ],
            jobDefs: [
                {
                    name: 'Job 59',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            target: TaskDefTarget.AWS_LAMBDA,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 59',
                                    lambdaRuntime: 'python3.7',
                                    lambdaRole: config.get('lambda-admin-iam-role'),
                                    lambdaAWSRegion: config.get('AWS_REGION'),
                                    lambdaDependencies: 'requests',
                                    lambdaTimeout: 10,
                                },
                            ],
                        },
                    ],
                    runtimeVars: {
                        sgAccessKeyId: { value: config.get('prodTestTeamAccessKeyId'), sensitive: false },
                        sgAccessKeySecret: { value: config.get('prodTestTeamAccessKeySecret'), sensitive: false },
                    },
                },
            ],
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let startedJobId;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { jobDefName: jobDefs['Job 59'].name });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', {
                Message: `job POST returned ${resApiCall.data.statusCode}`,
                _jobDefId: jobDefs['Job 59'].id,
            });
            return false;
        }
        startedJobId = resApiCall.data.data.id;

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model: {
                _teamId: config.get('sgTestTeam'),
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                id: startedJobId,
                type: 'Job',
            },
        };
        self.bpMessagesExpected.push(jobStartedBP);

        const taskOutcomeCreatedBP: any = {
            domainType: 'TaskOutcome',
            operation: 1,
            model: {
                _teamId: _teamId,
                _jobId: startedJobId,
                source: 1,
                status: TaskStatus.PUBLISHED,
                ipAddress: '0.0.0.0',
                machineId: 'lambda-executor',
                target: TaskDefTarget.AWS_LAMBDA,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskOutcomeCreatedBP);

        const stepOutcomeCreatedBP: any = {
            domainType: 'StepOutcome',
            operation: 1,
            model: {
                _teamId: _teamId,
                _jobId: startedJobId,
                name: 'Step 1',
                source: 1,
                machineId: 'lambda-executor',
                ipAddress: '0.0.0.0',
                status: StepStatus.RUNNING,
                type: 'StepOutcome',
            },
        };
        self.bpMessagesExpected.push(stepOutcomeCreatedBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;

        const taskOutcome = _.filter(
            self.bpMessages,
            (x) => x.domainType == 'TaskOutcome' && x.operation == 1 && x.model._jobId == startedJobId
        );
        if (taskOutcome.length < 1) {
            throw new Error(`Unable to find TaskOutcome - {operation: 1, _jobId: ${startedJobId}}`);
        }

        const stepOutcome = _.filter(
            self.bpMessages,
            (x) => x.domainType == 'StepOutcome' && x.operation == 1 && x.model._jobId == startedJobId
        );
        if (stepOutcome.length < 1) {
            throw new Error(`Unable to find StepOutcome - {operation: 1, _jobId: ${startedJobId}}`);
        }

        const stepOutcomeFailedBP: any = {
            domainType: 'StepOutcome',
            operation: 2,
            model: {
                status: StepStatus.FAILED,
                failureCode: TaskFailureCode.TASK_EXEC_ERROR,
                runtimeVars: { route: { value: 'fail' } },
                stderr: "~|name 'a' is not defined",
                exitCode: 1,
                _teamId: _teamId,
                id: stepOutcome[0].model.id,
                type: 'StepOutcome',
            },
        };
        self.bpMessagesExpected.push(stepOutcomeFailedBP);

        const taskOutcomeFailedBP: any = {
            domainType: 'TaskOutcome',
            operation: 2,
            model: {
                status: TaskStatus.FAILED,
                failureCode: TaskFailureCode.TASK_EXEC_ERROR,
                runtimeVars: { route: { value: 'fail' } },
                _teamId: _teamId,
                route: 'fail',
                id: taskOutcome[0].model.id,
                type: 'TaskOutcome',
            },
        };
        self.bpMessagesExpected.push(taskOutcomeFailedBP);

        const jobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model: {
                status: JobStatus.FAILED,
                id: startedJobId,
                type: 'Job',
            },
        };
        self.bpMessagesExpected.push(jobCompletedBP);

        result = await self.WaitForTestToComplete(60000);
        if (!result) return result;

        // newAgent.offline = true;
        // await newAgent.SendHeartbeat(false, true);
        // await newAgent.Stop();

        return true;
    }
}
