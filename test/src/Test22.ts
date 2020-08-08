import * as util from 'util';
import * as fs from 'fs';
import axios from 'axios';
import * as TestBase from './TestBase';
import { KikiStrings } from '../../server/src/shared/KikiStrings';
import * as Enums from '../../server/src/shared/Enums';
import { KikiUtils } from '../../server/src/shared/KikiUtils';
import { S3Access } from '../../server/src/shared/S3Access';
import { OrgSchema } from '../../server/src/api/domain/Org';
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
const script1_b64 = KikiUtils.btoa(script1);

let self: Test22;

let UploadFileToS3 = async (_orgId: string, filePath: string, fileType: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const compressedFilePath = await KikiUtils.GzipFile(filePath);

      let res = await self.testSetup.RestAPICall('artifact', 'POST', _orgId, null, {name: compressedFilePath, type: fileType});
      const artifact = res.data.data;

      // let s3Access = new S3Access();
      // let url = await s3Access.putSignedS3URL(`${s3Prefix}/${path.basename(compressedFilePath)}`, config.get('S3_BUCKET_ORG_ARTIFACTS'), fileType);

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

        // /// Create org
        // let org: any = {'name': 'TestOrg22', 'isActive': true, 'rmqPassword': KikiUtils.makeid(10)};
        // org = await self.CreateOrg(org);
        // self.orgs.push(org);

        // /// Create agents
        // let agent;
        // agent = { 
        //   '_orgId': _orgId, 
        //   'machineId': KikiUtils.makeid(), 
        //   'ipAddress': '10.10.0.90', 
        //   'tags': [], 
        //   'numActiveTasks': 0, 
        //   'lastHeartbeatTime': new Date().getTime(), 
        //   'rmqPassword': org['rmqPassword']
        // };
        // self.agents.push(agent);
 
        const orgName = 'TestOrg';
        const _orgId = self.testSetup.orgs[orgName].id;

        fs.writeFileSync('file1.txt', 'hello');
        fs.writeFileSync('file2.txt', 'world');  
        let artifact1: any = await UploadFileToS3(_orgId, 'file1.txt', 'multipart/form-data');
        let artifact2: any = await UploadFileToS3(_orgId, 'file2.txt', 'multipart/form-data');

        /// Create job def
        let jobDef: JobDefSchema = {
            _orgId: _orgId,
            name: 'Job 22',
            createdBy: this.sgUser.id,
            lastRunId: 0,
            dateCreated: new Date(),
            expectedValues: { 'type': 'job', 'matchCount': 1, 'cntPartialMatch': 0, 'cntFullMatch': 0, 'values': { [KikiStrings.status]: Enums.JobStatus.COMPLETED } },
        }
        jobDef = await self.CreateJobDef(jobDef, _orgId);
        self.jobDefs.push(jobDef);

        /// Create job def tasks
        let task: TaskDefSchema = {
          '_orgId': _orgId,
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
        task = await self.CreateTaskDef(task, _orgId);

        /// Create script
        let script_obj1: ScriptSchema = { '_orgId': _orgId, 'name': 'Script 22', 'scriptType': Enums.ScriptType.PYTHON, 'code': script1_b64, _originalAuthorUserId: this.sgUser.id, _lastEditedUserId: this.sgUser.id, lastEditedDate: new Date(), shadowCopyCode: script1_b64 };
        script_obj1 = await self.CreateScript(script_obj1, _orgId);
        self.scripts.push(script_obj1);            
        let step: StepDefSchema = { '_orgId': _orgId, '_taskDefId': task.id, 'name': 'step1', '_scriptId': script_obj1['id'], 'order': 0, 'arguments': ''};
        step = await self.CreateStepDef(step, _orgId, jobDef.id);

        task.expectedValues = {
          'type': 'task', 
            'matchCount': 5, 
            'tagsMatch': true, 
            'values': {[KikiStrings.status]: Enums.TaskStatus.SUCCEEDED}, 
            'runtimeVars': {[KikiStrings.route]: 'ok'}, 
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
