import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, ExecutionEnvironment } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
const fs = require('fs');
const axios_1 = require("axios");
const compressing = require("compressing");

let GzipFile = async (filePath) => {
    const compressedFilePath = filePath + ".gz";
    await new Promise((resolve, reject) => {
        compressing.gzip.compressFile(filePath, compressedFilePath)
            .then(() => { resolve(); })
            .catch((err) => { reject(err); });
    });
    return compressedFilePath;
};

const msgs = [];
msgs.push('Hello');
msgs.push('from');
msgs.push('lambda!');

let outFilePath = '/tmp/test.out';
fs.writeFileSync(outFilePath, JSON.stringify(msgs.join('\\n')));

let compressedFilePath = await GzipFile(outFilePath);

console.log(outFilePath + ' compressed to ' + compressedFilePath);
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test57;


export default class Test57 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test57', testSetup);
        this.description = 'Run task as lambda';

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
                    name: 'Script 57',
                    scriptType: ScriptType.NODE,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 57',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            executionEnvironment: ExecutionEnvironment.AWS_LAMBDA,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 57',
                                    lambdaRuntime: 'nodejs10.x',
                                    lambdaRole: config.get('lambda-admin-iam-role'),
                                    lambdaAWSRegion: config.get('AWS_REGION'),
                                    lambdaDependencies: 'compressing;axios'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let startedJobId;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { jobDefName: jobDefs['Job 57'].name });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 57'].id });
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
