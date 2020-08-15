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
print '@kpo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test6;


export default class Test6 extends TestBase.AdhocTaskTestBase {

    constructor(testSetup) {
        super('Test6', testSetup);
        this.description = 'Basic adhoc task test';

        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        // /// Create team
        // let team: any = { 'name': 'TestTeam6', 'isActive': true, 'rmqPassword': SGUtils.makeid(10) };
        // team = await self.CreateTeam(team);
        // self.teams.push(team);

        // /// Create agents
        // let agent;
        // agent = { '_teamId': _teamId, 'machineId': SGUtils.makeid(), 'ipAddress': '10.10.0.90', 'tags': [], 'numActiveTasks': 0, 'lastHeartbeatTime': new Date().getTime(), 'rmqPassword': team['rmqPassword'] };
        // self.agents.push(agent);

        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        let script_obj1: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 6', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);            

        /// Create tasks
        const correlationId: string = new mongodb.ObjectId().toString();
        let task: any = {
            _teamId: _teamId,
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
            'matchCount': 7,
            'tagsMatch': true,
            'values': { [SGStrings.status]: Enums.TaskStatus.SUCCEEDED, 'correlationId': correlationId, source: TaskSource.JOB },
            'runtimeVars': { [SGStrings.route]: 'ok' },
            'step': [
                { 'name': 'Step1', 'values': { 'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0 } }
            ],
            'cntPartialMatch': 0,
            'cntFullMatch': 0
        };
        self.tasks.push(task);

        // console.log(util.inspect(self.tasks, false, null));
    };
}
