import * as util from 'util';
import * as TestBase from './TestBase';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { SGStrings } from '../../server/src/shared/SGStrings';
import { TaskSchema } from '../../server/src/api/domain/Task';
import { StepSchema } from '../../server/src/api/domain/Step';
import { ScriptSchema } from '../../server/src/api/domain/Script';
import * as Enums from '../../server/src/shared/Enums';
import { TaskSource } from '../../server/src/shared/Enums';
import * as mongodb from 'mongodb';


const script1 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"globalParam1": "@kpg("globalParam1")"}'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test26;


export default class Test26 extends TestBase.AdhocTaskTestBase {

    constructor(testSetup) {
        super('Test26', testSetup);
        this.description = 'Parameters passed to adhoc task job test';

        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        // /// Create org
        // let org: any = { 'name': 'TestOrg6', 'isActive': true, 'rmqPassword': SGUtils.makeid(10) };
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { '_orgId': _orgId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': org['rmqPassword'] };
        // self.agents.push(agent);

        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 26', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);            

        /// Create tasks
        const correlationId: string = new mongodb.ObjectId().toString();
        let task: any = {
            _orgId: _orgId,
            name: 'Task1',
            source: TaskSource.JOB,
            requiredTags: [],
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            fromRoutes: [],
            steps: [
                {
                    name: 'Step1',
                    'script': {
                        scriptType: Enums.ScriptType[script_obj1.scriptType],
                        code: script_obj1.code
                    },
                    order: 0,
                    arguments: '',
                    variables: ''
                }
            ],
            correlationId: correlationId
        };

        task.expectedValues = {
            'type': 'task',
            'matchCount': 8,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED, 'correlationId': correlationId, 'source': TaskSource.JOB },
            'runtimeVars': { [SGStrings.route]: 'ok', 'globalParam1': 'globalParam1_val' },
            'step': [
                { 'name': 'Step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.tasks.push(task);

        // console.log(util.inspect(self.tasks, false, null));
    };


    public async RunTest() {
        self.logger.LogDebug(`Running test for \"${self.description}\"`);

        self.tasks.forEach(async (task) => {
            let data = {
                job: {
                    name: 'AdHocJob',
                    dateCreated: new Date(),
                    tasks: [ task ],
                    runtimeVars: {globalParam1: 'globalParam1_val'}
                }
            }
    
            await self.testSetup.RestAPICall(`job`, 'POST', task._orgId, { correlationId: task.correlationId }, data);
        });

        return await self.WaitForTestToComplete();
    }
}
