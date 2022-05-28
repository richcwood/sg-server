import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, TaskDefTarget, StepStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
print('start')
time.sleep(5)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

const script2 = `
import time
print('start')
time.sleep(2)
print('done')
print('@sgo{"rtKey": "@sgg("rtKey")"}')
print('@sgo{"agentId": "@sgg("_agentId")"}')
print('@sgo{"outVal": "val"}')
`;
const script2_b64 = SGUtils.btoa(script2);


let self: Test20;


export default class Test20 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test20', testSetup);
        this.description = 'Inactive agent job';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 20',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                },
                {
                    name: 'Inactive Agent Script',
                    scriptType: ScriptType.PYTHON,
                    code: script2_b64,
                    shadowCopyCode: script2_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 20',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 20'
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'Inactive Agent Job',
                    taskDefs: [
                        {
                            name: 'Task 1',
                            target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
                            targetAgentId: '@sgg("_agentId")',
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Inactive Agent Script'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);


        let agentMachineId: string = self.testSetup.agents[0].machineId;
        let agentId: string;
        resApiCall = await self.testSetup.RestAPICall(`agent?filter=machineId==${agentMachineId}&responseFields=id`, 'GET', _teamId, null);
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `agent/name/${agentMachineId}?responseFields=id GET returned ${resApiCall.data.statusCode}` });
            return false;
        }
        agentId = resApiCall.data.data[0].id;
        let inactiveJobName: string = `Inactive agent job - ${agentMachineId}`;

        resApiCall = await self.testSetup.RestAPICall(`agent/properties/${agentId}`, 'PUT', _teamId, null, { inactiveAgentJob: { id: jobDefs['Inactive Agent Job'].id, runtimeVars: { rtKey: { 'sensitive': false, 'value': 'rtVal' } } }, inactivePeriodWaitTime: 15000 });
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `agent/properties/${agentId} PUT returned ${resApiCall.data.statusCode}` });
            return false;
        }


        resApiCall = await this.testSetup.RestAPICall(`job`, 'POST', _teamId, { _jobDefId: jobDefs['Job 20'].id });
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `job POST returned ${resApiCall.data.statusCode}`, _jobDefId: jobDefs['Job 20'].id });
            return false;
        }
        let startedJobId = resApiCall.data.data.id;

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
        self.bpMessagesExpected.push(_.clone(jobCompletedBP));

        const inactiveAgentJobStartedBP: any = {
            domainType: 'Job',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobDefId: jobDefs[properties.jobDefs[1].name].id,
                runId: 0,
                name: inactiveJobName,
                status: 0,
                type: 'Job'
            }
        }
        self.bpMessagesExpected.push(inactiveAgentJobStartedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const inactiveJobQuery = _.filter(self.bpMessages, x => x.domainType == 'Job' && x.operation == 1 && x.model._jobDefId == jobDefs[properties.jobDefs[1].name].id && x.model.name == inactiveJobName);
        if (inactiveJobQuery.length < 1) {
            throw new Error(`Unable to find Inactive Job - {operation: 1, _jobDefId: ${jobDefs[properties.jobDefs[1].name].id}, name: ${inactiveJobName}}`);
        }
        const inactiveJob: any = inactiveJobQuery[0].model;

        const inactiveAgentJobCompletedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: 20,
                id: inactiveJob.id,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(_.clone(inactiveAgentJobCompletedBP));

        const inactiveAgentStepOutcomeCompletedBP: any = {
            domainType: 'StepOutcome',
            operation: 2,
            model:
            {
                status: StepStatus.SUCCEEDED,
                runtimeVars:
                {
                    rtKey: {'sensitive': false, 'value': 'rtVal'},
                    agentId: {'sensitive': false, 'value': agentId},
                    outVal: {'sensitive': false, 'value': 'val'}
                },
                stdout: `start\ndone\n@sgo{"rtKey": "rtVal"}\n@sgo{"agentId": "${agentId}"}\n@sgo{"outVal": "val"}\n`,
                stderr: '',
                exitCode: 0,
                lastUpdateId: 1,
                type: 'StepOutcome'
            }
        };
        self.bpMessagesExpected.push(_.clone(inactiveAgentStepOutcomeCompletedBP));

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;


        resApiCall = await self.testSetup.RestAPICall(`agent/properties/${agentId}`, 'PUT', _teamId, null, { inactiveAgentJob: {}, inactivePeriodWaitTime: 60000 });
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `agent/properties/${agentId} PUT returned ${resApiCall.data.statusCode}` });
            return false;
        }

        return true;
    }
}
