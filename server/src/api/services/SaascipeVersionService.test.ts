import * as mongodb from "mongodb";
import * as _ from "lodash";

import {SaascipeSchema} from "../domain/Saascipe";
import {SaascipeVersionSchema} from "../domain/SaascipeVersion";
import {saascipeService} from "./SaascipeService";
import {saascipeVersionService} from "./SaascipeVersionService";
import {SaascipeType} from "../../shared/Enums";
import {BaseLogger} from "../../shared/SGLogger";

import db from "../../test_helpers/DB";

import {CreateSaascipes} from "../../test_helpers/TestArtifacts";
import {CreateSaascipeVersions} from "../../test_helpers/TestArtifacts";
import {validateEquality} from "../../test_helpers/Validators";

const testName = "AgentService";

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

describe("SaascipeVersion service tests", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();

  const existingSaascipeId1 = new mongodb.ObjectId();
  const existingSaascipeVersionId1 = new mongodb.ObjectId();
  const publisherTeamId1 = new mongodb.ObjectId();
  const existingSaascipeId2 = new mongodb.ObjectId();
  const existingSaascipeVersionId2 = new mongodb.ObjectId();
  const publisherTeamId2 = new mongodb.ObjectId();
  let saascipeDefs: Array<Partial<SaascipeSchema>> = [];
  let saascipeVersionDefs: Array<Partial<SaascipeVersionSchema>> = [];
  let saascipes: {id: mongodb.ObjectId; data: SaascipeSchema}[] = [];
  let saascipeVersions: {id: mongodb.ObjectId; data: SaascipeVersionSchema}[] = [];

  beforeAll(async () => {
    saascipeDefs = [
      {
        _id: existingSaascipeId1,
        _publisherTeamId: publisherTeamId1,
        _publisherUserId: mongodb.ObjectId(),
        _sourceId: mongodb.ObjectId(),
        name: "Saascipe1",
        saascipeType: SaascipeType.JOB,
        description: "The first Saascipe",
        currentVersion: "v0.0.1",
      },
      {
        _id: existingSaascipeId2,
        _publisherTeamId: publisherTeamId2,
        _publisherUserId: mongodb.ObjectId(),
        _sourceId: mongodb.ObjectId(),
        name: "Saascipe2",
        saascipeType: SaascipeType.JOB,
        description: "A new Saascipe",
        currentVersion: "v0.0.1",
      },
    ];
    saascipes = await CreateSaascipes(_teamId, saascipeDefs);

    saascipeVersionDefs = [
      {
        _id: existingSaascipeVersionId1,
        _publisherTeamId: publisherTeamId1,
        _publisherUserId: mongodb.ObjectId(),
        _saascipeId: existingSaascipeId1,
        version: "v0.0.1",
        description: "Version 1",
        runtimeVarDescriptions: [],
      },
    ];
    saascipeVersions = await CreateSaascipeVersions(_teamId, saascipeVersionDefs);
  });

  test("Create Saascipe Version test", async () => {
    const data: any = {
      _id: mongodb.ObjectId(),
      _publisherTeamId: publisherTeamId1,
      _publisherUserId: mongodb.ObjectId(),
      _saascipeId: existingSaascipeId1,
      version: "v0.0.2",
      description: "Version 2",
      runtimeVarDescriptions: [],
    };
    const saascipeVersion: SaascipeVersionSchema = await saascipeVersionService.createSaascipeVersion(
      _teamId,
      data,
      "test1_correlation_id"
    );
    await expect(saascipeVersion).toEqual(
      expect.objectContaining({
        version: data.version,
        description: data.description,
      })
    );
    await validateEquality(saascipeVersion._id.toHexString(), data._id.toHexString());
    await validateEquality(saascipeVersion._publisherTeamId.toHexString(), data._publisherTeamId.toHexString());
    await validateEquality(saascipeVersion._publisherUserId.toHexString(), data._publisherUserId.toHexString());
    await validateEquality(saascipeVersion._saascipeId.toHexString(), data._saascipeId.toHexString());
  });

  test("Create Saascipe Version test duplicate fail", async () => {
    const data: any = {
      _id: mongodb.ObjectId(),
      _publisherTeamId: publisherTeamId1,
      _publisherUserId: mongodb.ObjectId(),
      _saascipeId: existingSaascipeId1,
      version: "v0.0.1",
      description: "Version 1 duplicate",
      runtimeVarDescriptions: [],
    };
    const saascipe: SaascipeSchema = _.filter(saascipes, (s) => s.id == existingSaascipeId1)[0].data;
    await expect(saascipeVersionService.createSaascipeVersion(_teamId, data, "test2_correlation_id")).rejects.toThrow(
      `Saascipe "${saascipe.name}" version "${data.version}" already exists`
    );
  });

  afterAll(async () => await db.clearDatabase());
});
