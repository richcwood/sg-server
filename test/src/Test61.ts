import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, TaskDefTarget } from '../../server/src/shared/Enums';
import * as _ from 'lodash';

const script1 = `
require "zlib"

unzipped = "/tmp/test.txt"
zipped = "/tmp/test.txt.gz"

File.open(unzipped, 'w') { |file| file.write("Hello from Ruby Lambda!") }

Zlib::GzipWriter.open(zipped) do |gz|
  gz.write IO.binread(unzipped)
end

puts "#{unzipped} compressed to #{zipped}";
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test61;

export default class Test61 extends TestBase.WorkflowTestBase {
    constructor(testSetup) {
        super('Test61', testSetup);
        this.description = 'Run ruby task with dependency as lambda';

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
                    name: 'Script 61',
                    scriptType: ScriptType.RUBY,
                    code: script1_b64,
                    shadowCopyCode: script1_b64,
                },
            ],
            jobDefs: [
                {
                    name: 'Job 61',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            target: TaskDefTarget.AWS_LAMBDA,
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 61',
                                    lambdaRuntime: 'ruby2.7',
                                    lambdaRole: config.get('lambda-admin-iam-role'),
                                    lambdaAWSRegion: config.get('AWS_REGION'),
                                    lambdaDependencies: 'requests',
                                    lambdaTimeout: 10,
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        let startedJobId;
        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { jobDefName: jobDefs['Job 61'].name });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', {
                Message: `job POST returned ${resApiCall.data.statusCode}`,
                _jobDefId: jobDefs['Job 61'].id,
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

        return true;
    }
}
