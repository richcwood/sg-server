import * as config from "config";
import * as mongodb from "mongodb";
import * as _ from "lodash";

import {BaseLogger} from "../../shared/SGLogger";
import {ExportScript} from "./SaascipeImportExport";
import {S3Access} from "../../shared/S3Access";
import {SaascipeSchema} from "../domain/Saascipe";
import {SaascipeType} from "../../shared/Enums";
import {ScriptSchema} from "../domain/Script";
import {SGUtils} from "../../shared/SGUtils";

import db from "../../test_helpers/DB";

import {CreateSaascipes, CreateScriptFromTemplate} from "../../test_helpers/TestArtifacts";
import {validateEquality} from "../../test_helpers/Validators";

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

describe("Saascipe exporter tests", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
  const _userId: mongodb.ObjectId = new mongodb.ObjectId();
  const saascipeId: mongodb.ObjectId = new mongodb.ObjectId();
  const scriptName: string = "Script 1";

  const environment = config.get("environment");
  let s3Path: string = `${_teamId.toHexString()}/script/${saascipeId.toHexString()}/scripts.json`;
  if (environment != "production") s3Path = environment + "/" + s3Path;

  let scripts: any = {};
  let saascipes: {id: mongodb.ObjectId; data: SaascipeSchema}[] = [];

  beforeAll(async () => {
    const script1 = `
      console.log('Hello World!');
      `;
    const scriptCodeB64: string = SGUtils.btoa(script1);
    const scriptTemplates: any[] = [
      {
        name: scriptName,
        scriptType: Enums.ScriptType.NODE,
        code: scriptCodeB64,
        shadowCopyCode: scriptCodeB64,
      },
    ];
    for (let scriptTemplate of scriptTemplates) {
      const script: ScriptSchema = await CreateScriptFromTemplate(_teamId, _userId, scriptTemplate);
      scripts[script.name] = script;
    }

    const saascipeTemplates: any[] = [
      {
        _id: saascipeId,
        _publisherTeamId: _teamId,
        _publisherUserId: _userId,
        _sourceId: scripts[scriptName].id,
        name: "Hello World",
        saascipeType: SaascipeType.SCRIPT,
        description: "Hello World Script Saascipe",
        s3Path,
      },
    ];
    saascipes = await CreateSaascipes(_teamId, saascipeTemplates);
  });

  test("Export saascipe script test", async () => {
    const saascipe: SaascipeSchema = _.filter(saascipes, (s) => s.id.toHexString() == saascipeId.toHexString())[0].data;

    await ExportScript(_teamId, saascipe._sourceId, saascipe.id);

    const s3Access = new S3Access();
    validateEquality(await s3Access.objectExists(saascipe.s3Path, saascipesS3Bucket), true);
    await s3Access.deleteObject(saascipe.s3Path, saascipesS3Bucket);
  });

  afterAll(async () => await db.clearDatabase());
});
