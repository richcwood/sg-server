import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, TaskDefTarget } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import requests
import json


token = ''

def RestAPILogin():
    global token

    url = 'http://saasglue.herokuapp.com/login/apiLogin'
    
    headers = {
        'Content-Type': 'application/json'
    }

    data = {
        'email': 'testuser@saasglue.com',
        'password': 'mypassword'
    }

    res = requests.post(url=url, headers=headers, data=json.dumps(data))
    if 'status_code' in res and res['status_code'] != 200:
        msg = 'Call to {} returned {} - {}'.format(url, res.status_code, res.text)
        raise Exception(msg)

    token = res.cookies.get_dict()['Auth']


while token == '':
    RestAPILogin()
    if token == '':
        print 'API login failed'
        sys.stdout.flush
        time.sleep(5)
        print 'Retrying api login'
        sys.stdout.flush

print '@sgo{{"sgAuthToken": "{}"}}'.format(token)
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test58;


export default class Test58 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test58', testSetup);
        this.description = 'Run python task with dependency as lambda';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        const sgAdminTeam: string = config.get('sgAdminTeam');
        const awsLambdaRequiredTags: string = config.get('awsLambdaRequiredTags');
        const newAgentProperties = { '_teamId': sgAdminTeam, 'machineId': 'AdminAgent', 'ipAddress': '10.10.0.104', 'tags': awsLambdaRequiredTags, 'numActiveTasks': 0, 'lastHeartbeatTime': null, 'rmqPassword': 'lpUs8Cnsju' };
        const newAgent = await self.testSetup.InitAgent(newAgentProperties);

        const properties: any = {
            scripts: [
                {
                    name: 'Script 58',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 58',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            target: TaskDefTarget.AWS_LAMBDA,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 58',
                                    lambdaRuntime: 'python2.7',
                                    lambdaRole: config.get('lambda-admin-iam-role'),
                                    lambdaAWSRegion: config.get('AWS_REGION'),
                                    lambdaDependencies: 'requests',
                                    lambdaTimeout: 10
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let startedJobId;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { jobDefName: jobDefs['Job 58'].name });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 58'].id });
            return false;
        }
        startedJobId = resApiCall.data.data.id;

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                id: startedJobId,
                type: 'Job'
            }
        }
        self.bpMessagesExpected.push(jobStartedBP);

        const jobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: 20,
                id: startedJobId,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(jobCompletedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;

        newAgent.offline = true;
        await newAgent.SendHeartbeat(false, true);
        await newAgent.Stop();
    
        return true;
    }
}
