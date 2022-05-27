import * as config from 'config';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { ScriptType, JobDefStatus, JobStatus } from '../../server/src/shared/Enums';
import * as _ from 'lodash';


const script1 = `
import time
print('start')
time.sleep(5)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);


let self: Test47;


export default class Test47 extends TestBase.WorkflowTestBase {

    constructor(testSetup) {
        super('Test47', testSetup);
        this.description = 'Misfire grace time test';

        self = this;
    }


    public async RunTest() {
        let result: boolean;
        let resApiCall: any;

        const _teamId: string = config.get('sgTestTeam');

        const properties: any = {
            scripts: [
                {
                    name: 'Script 47',
                    scriptType: ScriptType.PYTHON,
                    code: script1_b64,
                    shadowCopyCode: script1_b64
                }
            ],
            jobDefs: [
                {
                    name: 'Job 47',
                    misfireGraceTime: 1,
                    status: JobDefStatus.PAUSED,
                    taskDefs: [
                        {
                            name: 'Task 1',
                            stepDefs: [
                                {
                                    name: 'Step 1',
                                    scriptName: 'Script 47'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

        const runDate = new Date(new Date().getTime() + 10000);
        const schedule: any = {
            _teamId: config.get('sgTestTeam'),
            _jobDefId: jobDefs[properties.jobDefs[0].name].id,
            name: "Schedule1",
            isActive: true,
            TriggerType: "date",
            RunDate: runDate,
            FunctionKwargs: {
                _teamId: config.get('sgTestTeam'),
                targetId: jobDefs[properties.jobDefs[0].name].id
            }
        };

        resApiCall = await this.testSetup.RestAPICall(`schedule`, 'POST', _teamId, null, schedule);
        if (resApiCall.data.statusCode != 201) {
            self.logger.LogError('Failed', { Message: `schedule POST returned ${resApiCall.data.statusCode}` });
            return false;
        }
        schedule.id = resApiCall.data.data.id;


        const scheduleUpdateBP: any = {
            domainType: 'Schedule',
            operation: 2,
            model:
            {
                id: schedule.id,
                type: 'Schedule'
            }
        };
        self.bpMessagesExpected.push(scheduleUpdateBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        await SGUtils.sleep(12000);

        resApiCall = await this.testSetup.RestAPICall(`jobdef/${jobDefs[properties.jobDefs[0].name].id}`, 'PUT', _teamId, null, { status: JobDefStatus.RUNNING });
        if (resApiCall.data.statusCode != 200) {
            self.logger.LogError('Failed', { Message: `jobdef/${jobDefs[properties.jobDefs[0].name].id} PUT returned ${resApiCall.data.statusCode}`, status: JobDefStatus.RUNNING });
            return false;
        }

        const jobCreatedBP: any = {
            domainType: 'Job',
            operation: 1,
            model:
            {
                _teamId: config.get('sgTestTeam'),
                _jobDefId: jobDefs[properties.jobDefs[0].name].id,
                runId: 0,
                name: properties.jobDefs[0].name,
                status: 0,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(jobCreatedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;
        self.bpMessagesExpected.length = 0;


        const job = _.filter(self.bpMessages, x => x.domainType == 'Job' && x.operation == 1 && x.model._jobDefId == jobDefs[properties.jobDefs[0].name].id);

        const jobSkippedBP: any = {
            domainType: 'Job',
            operation: 2,
            model:
            {
                status: JobStatus.SKIPPED,
                error: 'Exceeded misfire grace time',
                id: job[0].model.id,
                type: 'Job'
            }
        };
        self.bpMessagesExpected.push(jobSkippedBP);

        result = await self.WaitForTestToComplete();
        if (!result)
            return result;


        return true;
    }
}

