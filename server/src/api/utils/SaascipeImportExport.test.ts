import {existsSync, mkdirSync, unlinkSync, writeFileSync} from "fs";

import * as config from "config";
import * as mongodb from "mongodb";
import * as _ from "lodash";

import {ArtifactSchema} from "../domain/Artifact";
import {JobDefSchema} from "../domain/JobDef";
import {SaascipeSchema} from "../domain/Saascipe";
import {SaascipeVersionSchema} from "../domain/SaascipeVersion";
import {ScriptSchema} from "../domain/Script";
import {TeamSchema} from "../domain/Team";

import {scriptService} from "../services/ScriptService";

import {RuntimeVariableFormat, SaascipeType, TaskDefTarget} from "../../shared/Enums";
import {
  ExportJobDefArtifacts,
  IJobDefExport,
  ImportScriptSaascipe,
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
import {validateArrayLength, validateEquality} from "../../test_helpers/Validators";

import * as Enums from "../../shared/Enums";

const testName = "SaascipeImportExportTest";
const saascipesS3Bucket = config.get("S3_BUCKET_SAASCIPES");

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
  let _teamId: mongodb.ObjectId;
  const _userId: mongodb.ObjectId = new mongodb.ObjectId();
  const _saascipeId: mongodb.ObjectId = new mongodb.ObjectId();
  const _saascipeVersionId: mongodb.ObjectId = new mongodb.ObjectId();
  const saascipeDescription: string = "Version 0.1 - the first version";
  const jobDefName: string = "Job 1";
  const scriptName_1: string = "Script 1";
  const scriptName_2: string = "Script 2";
  let artifacts: ArtifactSchema[] = [];
  const environment = config.get("environment");
  let s3Path: string;
  let team: TeamSchema;
  let jobDefs: Map<string, JobDefSchema>;
  let saascipes: {[key: string]: SaascipeSchema} = {};
  let saascipeTemplates: any[];
  let saascipeVersionTemplates: any[];

  beforeAll(async () => {
    await CreateSettingsFromTemplate();
    team = await CreateTeamFromTemplate(_userId, {}, logger);
    _teamId = team.id;
    s3Path = `${_teamId.toHexString()}/jobdef/${_saascipeId.toHexString()}`;
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
    const scriptTemplates: any[] = [
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
    const artifact: ArtifactSchema = await CreateArtifact(_teamId, artifactTemplate, compressedArtifactPath);
    artifacts.push(artifact);
    unlinkSync(artifactPath);

    const templates: any = {
      scripts: scriptTemplates,
      jobDefs: [
        {
          _teamId,
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

    const createJobDefsResult: {scripts: Array<ScriptSchema>; jobDefs: Map<string, JobDefSchema>} =
      await CreateJobDefsFromTemplates(_teamId, _userId, templates);
    jobDefs = createJobDefsResult.jobDefs;

    saascipeTemplates = [
      {
        _id: _saascipeId,
        _publisherTeamId: _teamId,
        _publisherUserId: _userId,
        _sourceId: jobDefs[jobDefName].id,
        name: "Job 1",
        saascipeType: SaascipeType.JOB,
        description: "Job for unit test",
      },
    ];
    saascipes = await CreateSaascipes(_teamId, saascipeTemplates);

    saascipeVersionTemplates = [
      {
        _id: _saascipeVersionId,
        _publisherTeamId: _teamId,
        _publisherUserId: _userId,
        _saascipeId: _saascipeId,
        description: saascipeDescription,
      },
    ];
  });

  test("Export saascipe JobDef test", async () => {
    const saascipe: SaascipeSchema = saascipes[_saascipeId.toHexString()];

    const saascipeDef: IJobDefExport = await PrepareJobDefForExport(_teamId, saascipe._sourceId);
    const templates: any[] = _.cloneDeep(saascipeVersionTemplates);
    templates[0]["saascipeDef"] = saascipeDef;

    const saascipeVersions: {[key: string]: SaascipeVersionSchema} = await CreateSaascipeVersions(_teamId, templates);

    await ExportJobDefArtifacts(_teamId, saascipeDef.artifacts, templates[0]);

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
      await s3Access.emptyS3Folder(saascipeVersionMatch.s3Path, saascipesS3Bucket);
    }
  });

  afterAll(async () => {
    await db.clearDatabase();
  });
});
