import {existsSync, mkdirSync, unlinkSync, writeFileSync} from "fs";

import * as config from "config";
import * as mongodb from "mongodb";
import * as _ from "lodash";

import {ArtifactSchema} from "../domain/Artifact";
import {JobDefSchema} from "../domain/JobDef";
import {SaascipeSchema} from "../domain/Saascipe";
import {SaascipeVersionSchema} from "../domain/SaascipeVersion";
import {ScriptSchema} from "../domain/Script";
import {StepDefSchema} from "../domain/StepDef";
import {ScheduleSchema} from "../domain/Schedule";
import {TaskDefSchema} from "../domain/TaskDef";
import {TeamSchema} from "../domain/Team";

import {scriptService} from "../services/ScriptService";
import {scheduleService} from "../services/ScheduleService";
import {stepDefService} from "../services/StepDefService";
import {taskDefService} from "../services/TaskDefService";

import {RuntimeVariableFormat, SaascipeType, TaskDefTarget} from "../../shared/Enums";
import {
  ExportJobDefArtifacts,
  IJobDefExport,
  ImportScriptSaascipe,
  ImportJobSaascipe,
  PrepareJobDefForExport,
  PrepareScriptForExport,
} from "./SaascipeImportExport";
import {S3Access} from "../../shared/S3Access";
import {BaseLogger} from "../../shared/SGLogger";
import {SGUtils} from "../../shared/SGUtils";

import db from "../../test_helpers/DB";

import {
  CreateArtifact,
  CreateJobDefsFromTemplates,
  CreateSaascipes,
  CreateSaascipeVersions,
  CreateScriptFromTemplate,
  CreateSettingsFromTemplate,
  CreateTeamFromTemplate,
} from "../../test_helpers/TestArtifacts";
import {
  validateArrayLength,
  validateDeepEquality,
  validateEquality,
  validateObjectMatch,
} from "../../test_helpers/Validators";

import * as Enums from "../../shared/Enums";
import {jobDefService} from "../services/JobDefService";

const testName = "SaascipeImportExportTest";
const saascipesS3Bucket = config.get("S3_BUCKET_SAASCIPES");
const artifactsBucket = config.get("S3_BUCKET_TEAM_ARTIFACTS");

let logger;

beforeAll(async () => {
  await db.open();

  logger = new BaseLogger(testName);
  logger.Start();
});

afterAll(async () => await db.close());

let OnBrowserPush = async (params: any, msgKey: string, ch: any) => {
  logger.LogInfo("OnBrowserPush message", params);
};

describe("SaaScipe Script export/import tests", () => {
  const _exportTeamId: mongodb.ObjectId = new mongodb.ObjectId();
  const _importTeamId: mongodb.ObjectId = new mongodb.ObjectId();
  const _userId: mongodb.ObjectId = new mongodb.ObjectId();
  const _importUserId: mongodb.ObjectId = new mongodb.ObjectId();
  const _saascipeId: mongodb.ObjectId = new mongodb.ObjectId();
  const _saascipeVersionId: mongodb.ObjectId = new mongodb.ObjectId();
  const saascipeDescription: string = "Version 0.1 - the first version";
  const script1Name: string = "Script 1";
  const script2Name: string = "Script 2";

  const environment = config.get("environment");
  let s3Path: string = `${_exportTeamId.toHexString()}/script/${_saascipeId.toHexString()}`;
  if (environment != "production") s3Path = environment + "/" + s3Path;

  let scripts: any = {};
  let saascipes: {[key: string]: SaascipeSchema} = {};

  let saascipeTemplates: any[];
  let saascipeVersionTemplates: any[];
  let scriptTemplates: any[];

  beforeAll(async () => {
    const script1 = `
      console.log('Hello from Script 1!');
      `;
    const script1CodeB64: string = SGUtils.btoa(script1);
    const script2 = `
      @sgs("${script1Name}")
      console.log('Hello from Script 2!');
      `;
    const script2CodeB64: string = SGUtils.btoa(script2);
    scriptTemplates = [
      {
        name: script1Name,
        scriptType: Enums.ScriptType.NODE,
        code: script1CodeB64,
      },
      {
        name: script2Name,
        scriptType: Enums.ScriptType.NODE,
        code: script2CodeB64,
      },
    ];
    for (let scriptTemplate of scriptTemplates) {
      const script: ScriptSchema = await CreateScriptFromTemplate(_exportTeamId, _userId, scriptTemplate);
      scripts[script.name] = script;
    }

    const importTeamScript = `
      console.log('Hello World!');
      `;
    const importTeamScriptCodeB64: string = SGUtils.btoa(importTeamScript);
    const importTeamScriptTemplate: any = {
      name: script1Name,
      scriptType: Enums.ScriptType.NODE,
      code: importTeamScriptCodeB64,
    };
    await CreateScriptFromTemplate(_importTeamId, _importUserId, importTeamScriptTemplate);

    saascipeTemplates = [
      {
        _id: _saascipeId,
        _publisherTeamId: _exportTeamId,
        _publisherUserId: _userId,
        _sourceId: scripts[script2Name].id,
        name: "Hello World",
        saascipeType: SaascipeType.SCRIPT,
        description: "Hello World Script Saascipe",
      },
    ];
    saascipes = await CreateSaascipes(_exportTeamId, saascipeTemplates);

    saascipeVersionTemplates = [
      {
        _id: _saascipeVersionId,
        _publisherTeamId: _exportTeamId,
        _publisherUserId: _userId,
        _saascipeId: _saascipeId,
        description: saascipeDescription,
      },
    ];
  });

  test("Export/import saascipe script test", async () => {
    const saascipe: SaascipeSchema = saascipes[_saascipeId.toHexString()];

    const saascipeDef: Partial<ScriptSchema>[] = await PrepareScriptForExport(_exportTeamId, saascipe._sourceId);
    const templates: any[] = _.cloneDeep(saascipeVersionTemplates);
    templates[0]["saascipeDef"] = saascipeDef;
    const saascipeVersions: {[key: string]: SaascipeVersionSchema} = await CreateSaascipeVersions(
      _exportTeamId,
      templates
    );

    const saascipeTemplate: any = _.cloneDeep(saascipeTemplates)[0];
    validateEquality(saascipeTemplate["_publisherTeamId"].toHexString(), saascipe._publisherTeamId.toHexString());
    validateEquality(saascipeTemplate["_publisherUserId"].toHexString(), saascipe._publisherUserId.toHexString());
    validateEquality(saascipeTemplate["_sourceId"].toHexString(), saascipe._sourceId.toHexString());
    validateEquality(saascipeTemplate["name"], saascipe.name);
    validateEquality(saascipeTemplate["description"], saascipe.description);
    validateEquality(saascipeTemplate["saascipeType"], saascipe.saascipeType);
    validateEquality(saascipe["currentVersion"], 0);

    const template: any = templates[0];
    const saascipeVersionMatch: SaascipeVersionSchema = saascipeVersions[template["_id"].toHexString()];
    validateEquality(template["_publisherTeamId"].toHexString(), saascipeVersionMatch._publisherTeamId.toHexString());
    validateEquality(template["_publisherUserId"].toHexString(), saascipeVersionMatch._publisherUserId.toHexString());
    validateEquality(template["_saascipeId"].toHexString(), saascipeVersionMatch._saascipeId.toHexString());
    validateEquality(saascipeVersionMatch["version"], 0);
    validateEquality(template["description"], saascipeVersionMatch.description);

    const scriptMatch: any = saascipeVersionMatch.saascipeDef;
    const scriptTemplate: any = scriptTemplates[1];
    validateEquality(scriptMatch[0]["name"], scriptTemplate["name"]);
    validateEquality(scriptMatch[0]["scriptType"], scriptTemplate["scriptType"]);
    validateEquality(scriptMatch[0]["code"], scriptTemplate["code"]);

    await ImportScriptSaascipe(_importTeamId, _importUserId, saascipeVersionMatch);
    const importTeamScripts: Array<ScriptSchema> = await scriptService.findAllScriptsInternal({
      _teamId: _importTeamId,
    });
    validateArrayLength(importTeamScripts, 3);
    validateEquality(importTeamScripts[0].name, script1Name);
    validateEquality(importTeamScripts[1].name, script2Name);
    validateEquality(importTeamScripts[2].name, `${script1Name}_import_1`);
  });

  afterAll(async () => await db.clearDatabase());
});

describe("SaaScipe JobDef exporter tests", () => {
  let _exportTeamId: mongodb.ObjectId = new mongodb.ObjectId();
  let _importTeamId: mongodb.ObjectId = new mongodb.ObjectId();
  const _exportUserId: mongodb.ObjectId = new mongodb.ObjectId();
  const _importUserId: mongodb.ObjectId = new mongodb.ObjectId();
  const _saascipeId: mongodb.ObjectId = new mongodb.ObjectId();
  const _saascipeVersionId: mongodb.ObjectId = new mongodb.ObjectId();
  const saascipeDescription: string = "Version 0.1 - the first version";
  const jobDefName: string = "Job 1";
  const scriptName_1: string = "Script 1";
  const scriptName_2: string = "Script 2";
  let artifacts: ArtifactSchema[] = [];
  const environment = config.get("environment");
  let s3Path: string;
  let exportTeam: TeamSchema;
  let importTeam: TeamSchema;
  let jobDefs: Map<string, JobDefSchema>;
  let scripts: Map<string, ScriptSchema>;
  let schedules: Array<ScheduleSchema>;
  let saascipes: {[key: string]: SaascipeSchema} = {};
  let saascipeTemplates: any[];
  let scriptTemplates: any[];
  let saascipeVersionTemplates: any[];
  let scheduleTemplates: any[];
  let jobDefTemplates: any;
  const correlationId: string = "";

  beforeAll(async () => {
    await CreateSettingsFromTemplate();
    exportTeam = await CreateTeamFromTemplate(_exportUserId, {name: "Test Team 1"}, logger);
    _exportTeamId = exportTeam.id;
    importTeam = await CreateTeamFromTemplate(_importUserId, {name: "Test Team 2"}, logger);
    _importTeamId = importTeam.id;
    s3Path = `${_exportTeamId.toHexString()}/jobdef/${_saascipeId.toHexString()}`;
    if (environment != "production") s3Path = environment + "/" + s3Path;

    const script1 = `
        console.log('Hello @sgg("name")!');
        `;
    const scriptCodeB64_1: string = SGUtils.btoa(script1);
    const script2 = `
        @sgs("Script 1");
        console.log('Hello Again!');
        `;
    const scriptCodeB64_2: string = SGUtils.btoa(script2);
    scriptTemplates = [
      {
        name: scriptName_1,
        scriptType: Enums.ScriptType.NODE,
        code: scriptCodeB64_1,
        shadowCopyCode: scriptCodeB64_1,
      },
      {
        name: scriptName_2,
        scriptType: Enums.ScriptType.NODE,
        code: scriptCodeB64_2,
        shadowCopyCode: scriptCodeB64_2,
      },
    ];

    const artifactTemplate: Partial<ArtifactSchema> = {
      name: "file1.txt.gz",
      type: "multipart/form-data",
    };

    const workingDir: string = "/tmp/sg-service-test";
    if (!existsSync(workingDir)) {
      mkdirSync(workingDir, {recursive: true});
    }
    const artifactPath: string = `${workingDir}/${artifactTemplate.name}`;
    writeFileSync(artifactPath, "hello world");
    const compressedArtifactPath = await SGUtils.GzipFile(artifactPath);
    const artifact: ArtifactSchema = await CreateArtifact(_exportTeamId, artifactTemplate, compressedArtifactPath);
    artifacts.push(artifact);
    unlinkSync(artifactPath);

    scheduleTemplates = [
      {
        FunctionKwargs: {
          runtimeVars: {
            rtVar1: {
              value: "schedule_param_1",
              sensitive: true,
              format: RuntimeVariableFormat.YAML,
            },
          },
        },
      },
    ];

    jobDefTemplates = {
      scripts: scriptTemplates,
      schedules: scheduleTemplates,
      jobDefs: [
        {
          _teamId: _exportTeamId,
          name: jobDefName,
          maxInstances: 10,
          misfireGraceTime: 60,
          coalesce: true,
          pauseOnFailedJob: true,
          runtimeVars: {
            rtVar1: {
              value: "val1",
              sensitive: false,
              format: RuntimeVariableFormat.TEXT,
            },
          },
          taskDefs: [
            {
              target: TaskDefTarget.SINGLE_AGENT,
              name: "Task 1",
              order: 1,
              requiredTags: {
                tagKey: "tagValue",
              },
              fromRoutes: ["ok"],
              toRoutes: [],
              artifacts: [artifact.id],
              autoRestart: false,
              stepDefs: [
                {
                  name: "Step 1",
                  order: 1,
                  command: "",
                  arguments: "",
                  scriptName: scriptName_2,
                },
              ],
            },
          ],
        },
      ],
    };

    const createJobDefsResult: {
      scripts: Map<string, ScriptSchema>;
      jobDefs: Map<string, JobDefSchema>;
      schedules: Array<ScheduleSchema>;
    } = await CreateJobDefsFromTemplates(_exportTeamId, _exportUserId, jobDefTemplates);
    jobDefs = createJobDefsResult.jobDefs;
    scripts = createJobDefsResult.scripts;
    schedules = createJobDefsResult.schedules;

    saascipeTemplates = [
      {
        _id: _saascipeId,
        _publisherTeamId: _exportTeamId,
        _publisherUserId: _exportUserId,
        _sourceId: jobDefs[jobDefName].id,
        name: "Job 1",
        saascipeType: SaascipeType.JOB,
        description: "Job for unit test",
      },
    ];
    saascipes = await CreateSaascipes(_exportTeamId, saascipeTemplates);

    saascipeVersionTemplates = [
      {
        _id: _saascipeVersionId,
        _publisherTeamId: _exportTeamId,
        _publisherUserId: _exportUserId,
        _saascipeId: _saascipeId,
        description: saascipeDescription,
      },
    ];
  });

  test("Export saascipe JobDef test", async () => {
    const saascipe: SaascipeSchema = saascipes[_saascipeId.toHexString()];

    const saascipeDef: IJobDefExport = await PrepareJobDefForExport(_exportTeamId, saascipe._sourceId);
    const saascipeVersionTemplatesCopy: any[] = _.cloneDeep(saascipeVersionTemplates);
    saascipeVersionTemplatesCopy[0]["saascipeDef"] = saascipeDef;

    const saascipeVersions: {[key: string]: SaascipeVersionSchema} = await CreateSaascipeVersions(
      _exportTeamId,
      saascipeVersionTemplatesCopy
    );

    await ExportJobDefArtifacts(_exportTeamId, saascipeDef.artifacts, saascipeVersionTemplatesCopy[0]);

    const s3Access = new S3Access();
    const saascipeTemplate: any = _.cloneDeep(saascipeTemplates)[0];
    validateEquality(saascipeTemplate["_publisherTeamId"].toHexString(), saascipe._publisherTeamId.toHexString());
    validateEquality(saascipeTemplate["_publisherUserId"].toHexString(), saascipe._publisherUserId.toHexString());
    validateEquality(saascipeTemplate["_sourceId"].toHexString(), saascipe._sourceId.toHexString());
    validateEquality(saascipeTemplate["name"], saascipe.name);
    validateEquality(saascipeTemplate["description"], saascipe.description);
    validateEquality(saascipeTemplate["saascipeType"], saascipe.saascipeType);
    validateEquality(saascipe["currentVersion"], 0);

    const jobDef: JobDefSchema = jobDefs[jobDefName];
    for (let template of saascipeVersionTemplates) {
      const saascipeVersionId: string = template["_id"].toHexString();
      const saascipeVersionMatch: SaascipeVersionSchema = saascipeVersions[saascipeVersionId];
      validateEquality(template["_publisherTeamId"].toHexString(), saascipeVersionMatch._publisherTeamId.toHexString());
      validateEquality(template["_publisherUserId"].toHexString(), saascipeVersionMatch._publisherUserId.toHexString());
      validateEquality(template["_saascipeId"].toHexString(), saascipeVersionMatch._saascipeId.toHexString());
      validateEquality(saascipeVersionMatch["version"], 0);
      validateEquality(template["description"], saascipeVersionMatch.description);

      const saascipeDef: any = saascipeVersionMatch.saascipeDef;
      validateEquality(jobDef.name, saascipeDef.jobDef.name);
      validateEquality(jobDef.maxInstances, saascipeDef.jobDef.maxInstances);
      validateEquality(jobDef.misfireGraceTime, saascipeDef.jobDef.misfireGraceTime);
      validateEquality(jobDef.coalesce, saascipeDef.jobDef.coalesce);
      validateEquality(jobDef.pauseOnFailedJob, saascipeDef.jobDef.pauseOnFailedJob);
      validateEquality(Object.keys(jobDef.runtimeVars).length, Object.keys(saascipeDef.jobDef.runtimeVars).length);
      for (let k of Object.keys(jobDef.runtimeVars)) {
        expect(Object.keys(saascipeDef.jobDef.runtimeVars)).toEqual(expect.arrayContaining([k]));
        const rtvar_job: any = jobDef.runtimeVars[k];
        const rtvar_saascipe: any = saascipeDef.jobDef.runtimeVars[k];
        validateEquality("*", rtvar_saascipe.value);
        validateEquality(rtvar_job.sensitive, rtvar_saascipe.sensitive);
        validateEquality(rtvar_job.format, rtvar_saascipe.format);
      }

      for (let artifact of saascipeDef.artifacts) {
        let destPath: string = `${saascipeVersionId}/${artifact.name}`;
        if (environment != "production") destPath = environment + "/" + destPath;
        validateEquality(await s3Access.objectExists(destPath, saascipesS3Bucket), true);
      }

      await ImportJobSaascipe(_importTeamId, _importUserId, _saascipeVersionId, correlationId);

      const importScripts: Array<ScriptSchema> = await scriptService.findAllScriptsInternal({
        _teamId: _importTeamId,
      });
      validateArrayLength(importScripts, scriptTemplates.length);
      for (let scriptTemplate of scriptTemplates) {
        const importScriptMatch = _.filter(importScripts, (s) => s.name == scriptTemplate.name);
        validateArrayLength(importScriptMatch, 1);
        const importScript: ScriptSchema = importScriptMatch[0];
        validateEquality(importScript._teamId.toHexString(), _importTeamId.toHexString());
        validateEquality(importScript.scriptType, scriptTemplate.scriptType);
        validateEquality(importScript.code, scriptTemplate.code);
        validateEquality(importScript._originalAuthorUserId.toHexString(), _importUserId.toHexString());
        validateEquality(importScript._lastEditedUserId.toHexString(), _importUserId.toHexString());
      }

      const importJobDefs: Array<JobDefSchema> = await jobDefService.findAllJobDefsInternal({
        _teamId: _importTeamId,
      });
      validateArrayLength(importJobDefs, 1);
      validateEquality(importJobDefs[0].name, jobDefName);
      validateEquality(importJobDefs[0]._teamId.toHexString(), _importTeamId.toHexString());
      validateEquality(importJobDefs[0].createdBy.toHexString(), _importUserId.toHexString());
      validateEquality(importJobDefs[0].lastRunId, 0);
      validateEquality(importJobDefs[0].maxInstances, jobDefTemplates.jobDefs[0].maxInstances);
      validateEquality(importJobDefs[0].coalesce, jobDefTemplates.jobDefs[0].coalesce);
      validateEquality(importJobDefs[0].pauseOnFailedJob, jobDefTemplates.jobDefs[0].pauseOnFailedJob);
      validateArrayLength(Object.keys(importJobDefs[0].runtimeVars), 1);
      validateEquality(importJobDefs[0].runtimeVars.rtVar1.value, "*");
      validateEquality(importJobDefs[0].runtimeVars.rtVar1.sensitive, false);
      validateEquality(importJobDefs[0].runtimeVars.rtVar1.format, "plaintext");

      const importTaskDefs: Array<TaskDefSchema> = await taskDefService.findAllTaskDefsInternal({
        _teamId: _importTeamId,
      });
      validateArrayLength(importTaskDefs, 1);
      validateEquality(importTaskDefs[0]._teamId.toHexString(), _importTeamId.toHexString());
      validateEquality(importTaskDefs[0]._jobDefId.toHexString(), importJobDefs[0]._id.toHexString());
      validateEquality(importTaskDefs[0].name, jobDefTemplates.jobDefs[0].taskDefs[0].name);
      validateEquality(importTaskDefs[0].order, jobDefTemplates.jobDefs[0].taskDefs[0].order);
      validateEquality(
        importTaskDefs[0].requiredTags.tagKey,
        jobDefTemplates.jobDefs[0].taskDefs[0].requiredTags.tagKey
      );
      validateDeepEquality(importTaskDefs[0].fromRoutes, jobDefTemplates.jobDefs[0].taskDefs[0].fromRoutes);
      validateDeepEquality(importTaskDefs[0].toRoutes, jobDefTemplates.jobDefs[0].taskDefs[0].toRoutes);

      const importStepDefs: Array<StepDefSchema> = await stepDefService.findAllStepDefsInternal({
        _teamId: _importTeamId,
      });
      validateArrayLength(importStepDefs, 1);
      validateEquality(importStepDefs[0]._teamId.toHexString(), _importTeamId.toHexString());
      validateEquality(importStepDefs[0]._taskDefId.toHexString(), importTaskDefs[0]._id.toHexString());
      validateEquality(importStepDefs[0].name, jobDefTemplates.jobDefs[0].taskDefs[0].stepDefs[0].name);
      validateEquality(importStepDefs[0].order, jobDefTemplates.jobDefs[0].taskDefs[0].stepDefs[0].order);
      validateEquality(importStepDefs[0].command, jobDefTemplates.jobDefs[0].taskDefs[0].stepDefs[0].command);
      validateEquality(importStepDefs[0].arguments, jobDefTemplates.jobDefs[0].taskDefs[0].stepDefs[0].arguments);

      const importSchedules: Array<ScheduleSchema> = await scheduleService.findAllSchedulesInternal({
        _teamId: _importTeamId,
      });
      validateArrayLength(importSchedules, scheduleTemplates.length);
      for (let schedule of schedules) {
        const importScheduleMatch = _.filter(importSchedules, (s) => s.name == schedule.name);
        validateArrayLength(importScheduleMatch, 1);
        const importSchedule: ScheduleSchema = importScheduleMatch[0];
        validateEquality(importSchedule._teamId.toHexString(), _importTeamId.toHexString());
        validateEquality(importSchedule._jobDefId.toHexString(), importJobDefs[0]._id.toHexString());
        validateEquality(importSchedule.isActive, schedule.isActive);
        validateEquality(importSchedule.TriggerType, schedule.TriggerType);
        validateDeepEquality(importSchedule.cron, schedule.cron);
        validateEquality(importSchedule.createdBy.toHexString(), _importUserId.toHexString());
        validateEquality(importSchedule.lastUpdatedBy.toHexString(), _importUserId.toHexString());
        validateEquality(importSchedule.FunctionKwargs._teamId.toHexString(), _importTeamId.toHexString());
        validateEquality(importSchedule.FunctionKwargs.targetId.toHexString(), importJobDefs[0]._id.toHexString());
        for (let rtVar of Object.keys(schedule.FunctionKwargs.runtimeVars)) {
          expect(Object.keys(importSchedule.FunctionKwargs.runtimeVars)).toEqual(expect.arrayContaining([rtVar]));
          validateEquality(importSchedule.FunctionKwargs.runtimeVars[rtVar].value, "*");
          validateEquality(importSchedule.FunctionKwargs.runtimeVars[rtVar].sensitive, false);
          validateEquality(
            importSchedule.FunctionKwargs.runtimeVars[rtVar].format,
            schedule.FunctionKwargs.runtimeVars[rtVar].format
          );
        }
      }

      await s3Access.emptyS3Folder(saascipeVersionMatch.s3Path, saascipesS3Bucket);

      let exportArtifactsPath = `${_exportTeamId.toHexString()}/`;
      if (environment != "production") exportArtifactsPath = environment + "/" + exportArtifactsPath;
      await s3Access.emptyS3Folder(exportArtifactsPath, artifactsBucket);

      let importArtifactsPath = `${_importTeamId.toHexString()}/`;
      if (environment != "production") importArtifactsPath = environment + "/" + importArtifactsPath;
      await s3Access.emptyS3Folder(importArtifactsPath, artifactsBucket);
    }
  });

  afterAll(async () => {
    await db.clearDatabase();
  });
});
