import * as util from 'util';
import * as fs from 'fs';
import axios from 'axios';
import * as TestBase from './TestBase';
import { SGStrings } from '../../server/src/shared/SGStrings';
import * as Enums from '../../server/src/shared/Enums';
import { SGUtils } from '../../server/src/shared/SGUtils';
import { S3Access } from '../../server/src/shared/S3Access';
import { TeamSchema } from '../../server/src/api/domain/Team';
import { JobDefSchema } from '../../server/src/api/domain/JobDef';
import { TaskDefSchema } from '../../server/src/api/domain/TaskDef';
import { StepDefSchema } from '../../server/src/api/domain/StepDef';
import { ScriptSchema } from '../../server/src/api/domain/Script';
import * as path from 'path';
import * as config from 'config';


const script1 = `
import time
print 'start'
time.sleep(2)
print 'done'
print '@kpo{"route": "ok"}'
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test22;

let UploadFileToS3 = async (_teamId: string, filePath: string, fileType: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const compressedFilePath = await SGUtils.GzipFile(filePath);

      let res = await self.testSetup.RestAPICall('artifact', 'POST', _teamId, null, {name: compressedFilePath, type: fileType});
      const artifact = res.data.data;

      // let s3Access = new S3Access();
      // let url = await s3Access.putSignedS3URL(`${s3Prefix}/${path.basename(compressedFilePath)}`, config.get('S3_BUCKET_TEAM_ARTIFACTS'), fileType);

      var options = {
        headers: {
          'Content-Type': fileType
        }
      };

      await axios.put(artifact.url, compressedFilePath, options);
      fs.unlinkSync(filePath);
      resolve(artifact);
    } catch (e) {
      reject(`Error uploading file '${filePath}': ${e.message} - ${e.stack}`);
    }
  });
}


export default class Test22 extends TestBase.default {

    constructor(testSetup) {
        super('Test22', testSetup);
        this.description = 'Artifacts test';

        self = this;
    }

    public async CreateTest() {
        await super.CreateTest();

        // /// Create team
        // let team: any = {'name': 'TestTeam22', 'isActive': true, 'rmqPassword': SGUtils.makeid(10)};
        // team = await self.CreateTeam(team);
        // self.teams.push(team);

        // /// Create agents
        // let agent;
        // agent = { 
        //   '_teamId': _teamId, 
        //   'machineId': SGUtils.makeid(), 
        //   'ipAddress': '10.10.0.90', 
        //   'tags': [], 
        //   'numActiveTasks': 0, 
        //   'lastHeartbeatTime': new Date().getTime(), 
        //   'rmqPassword': team['rmqPassword']
        // };
        // self.agents.push(agent);
 
        const teamName = 'TestTeam';
        const _teamId = self.testSetup.teams[teamName].id;

        fs.writeFileSync('file1.txt', 'hello');
        fs.writeFileSync('file2.txt', 'world');  
        let artifact1: any = await UploadFileToS3(_teamId, 'file1.txt', 'multipart/form-data');
        let artifact2: any = await UploadFileToS3(_teamId, 'file2.txt', 'multipart/form-data');

        /// Create job def
        let jobDef: JobDefSchema = {
            _teamId: _teamId,
            name: 'Job 22',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [SGStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _teamId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let task: TaskDefSchema = {
          '_teamId': _teamId,
          'name': 'Task1', 
          'target': Enums.TaskDefTarget.SINGLE_AGENT, 
          'requiredTags': {}, 
          '_jobDefId': jobDef.id, 
          'fromRoutes': [],
          'artifacts': [
            artifact1.id,
            artifact2.id
          ]
        };
        task = await self.CreateTaskDef(task, _teamId);

        /// Create script
        let script_obj1: ScriptSchema = { '_teamId': _teamId, 'name': 'Script 22', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _teamId);
        self.scripts.push(script_obj1);            
        let step: StepDefSchema = { '_teamId': _teamId, '_taskDefId': task.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step = await self.CreateStepDef(step, _teamId, jobDef.id);

        task.expectedValues = {
          'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[SGStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'runtimeVars': {[SGStrings.route]: 'ok'}, 
            'step': [
                { 'name': step.name, 'values': {'status': Enums.TaskStatus.SUCCEEDED, 'stderr': '', 'exitCode': 0}}
            ], 
            'cntPartialMatch': 0, 
            'cntFullMatch': 0,
            'artifacts': [
              artifact1.id,
              artifact2.id
            ]
        };
        self.taskDefs.push(task);

        console.log(util.inspect(this, false, 5, true));
      };
}
