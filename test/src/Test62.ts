import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGAgentUtils } from './utils/SGAgentUtils';
import { ScriptType, TaskDefTarget } from '../../server/src/shared/Enums';
import * as _ from 'lodash';

const script1 = `
console.log('Hello from lambda!');
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test62;

export default class Test62 extends TestBase.WorkflowTestBase {
    constructor(testSetup) {
        super('Test62', testSetup);
        this.description = 'Run node task as lambda zipfile loaded to s3';

        self = this;
    }

    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = process.env.sgTestTeam;

        const workingDirectory: string = process.cwd() + '/test62lambda';

        if (fs.existsSync(workingDirectory)) fse.removeSync(workingDirectory);
        fs.mkdirSync(workingDirectory);

        const lambdaZipFile = <string>(
            await SGAgentUtils.CreateAWSLambdaZipFile_NodeJS(workingDirectory, script1, '', 'test62')
        );

        let res: any = await self.testSetup.RestAPICall('artifact', 'POST', _teamId, null, {
            name: path.basename(lambdaZipFile),
            type: 'multipart/form-data',
        });
        const artifact = res.data.data;

        await SGAgentUtils.RunCommand(`curl -v --upload-file "${lambdaZipFile}" "${artifact.url}"`, {});

        // const sgAdminTeam: string = process.env.sgAdminTeam;
        // const awsLambdaRequiredTags: string = config.get('awsLambdaRequiredTags');
        // const newAgentProperties = { '_teamId': sgAdminTeam, 'machineId': 'AdminAgent', 'ipAddress': '10.10.0.104', 'tags': awsLambdaRequiredTags, 'numActiveTasks': 0, 'lastHeartbeatTime': null, 'rmqPassword': 'lpUs8Cnsju' };
        // const newAgent = await self.testSetup.InitAgent(newAgentProperties);

        const properties: any = {
            scripts: [
                {
                    name: 'Script 62',
                    scriptType: ScriptType.NODE,
                    code: script1_b64,
                    shadowCopyCode: script1_b64,
                },
            ],
            jobDefs: [
                {
                    name: 'Job 62',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            target: TaskDefTarget.AWS_LAMBDA,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 62',
                                    lambdaRuntime: 'nodejs14.x',
                                    lambdaRole: config.get('lambda-admin-iam-role'),
                                    lambdaAWSRegion: config.get('AWS_REGION'),
                                    lambdaZipfile: artifact.id,
                                    lambdaFunctionHandler: 'index.handler',
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let startedJobId;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { jobDefName: jobDefs['Job 62'].name });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', {
                Message: `job POST returned ${resApiCall.data.statusCode}`,
                _jobDefId: jobDefs['Job 62'].id,
            });
            return false;
        }
        startedJobId = resApiCall.data.data.id;

        const jobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model: {
                _teamId: process.env.sgTestTeam,
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                id: startedJobId,
                type: 'Job',
            },
        };
        self.bpMessagesExpected.push(jobStartedBP);

        const jobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model: {
                status: 20,
                id: startedJobId,
                type: 'Job',
            },
        };
        self.bpMessagesExpected.push(jobCompletedBP);

        result = await self.WaitForTestToComplete();
        if (!result) return result;

        // newAgent.offline = true;
        // await newAgent.SendHeartbeat(false, true);
        // await newAgent.Stop();

        await self.testSetup.RestAPICall(`artifact/${artifact.id}`, 'DELETE', _teamId, null, null);
        fs.unlinkSync(lambdaZipFile);

        return true;
    }
}
