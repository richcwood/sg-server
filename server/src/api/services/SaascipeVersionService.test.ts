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
  let saascipeVersions: {[key: string]: SaascipeVersionSchema} = {};

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
      },
      {
        _id: existingSaascipeId2,
        _publisherTeamId: publisherTeamId2,
        _publisherUserId: mongodb.ObjectId(),
        _sourceId: mongodb.ObjectId(),
        name: "Saascipe2",
        saascipeType: SaascipeType.JOB,
        description: "A new Saascipe",
      },
    ];
    await CreateSaascipes(_teamId, saascipeDefs);

    saascipeVersionDefs = [
      {
        _id: existingSaascipeVersionId1,
        _publisherTeamId: publisherTeamId1,
        _publisherUserId: mongodb.ObjectId(),
        _saascipeId: existingSaascipeId1,
        saascipeDef: {},
        description: "Version 1",
        runtimeVarDescriptions: [],
      },
    ];
    saascipeVersions = await CreateSaascipeVersions(_teamId, saascipeVersionDefs);
  });

  test("Create Saascipe Version test", async () => {
    const data1: any = {
      _id: mongodb.ObjectId(),
      _publisherTeamId: publisherTeamId1,
      _publisherUserId: mongodb.ObjectId(),
      _saascipeId: existingSaascipeId1,
      saascipeDef: {},
      description: "Version 1",
      runtimeVarDescriptions: [],
    };
    const saascipeVersion1: SaascipeVersionSchema = await saascipeVersionService.createSaascipeVersion(
      _teamId,
      data1,
      "saascipe_v1_correlation_id"
    );
    await expect(saascipeVersion1).toEqual(
      expect.objectContaining({
        version: 1,
        description: data1.description,
      })
    );
    await validateEquality(saascipeVersion1._id.toHexString(), data1._id.toHexString());
    await validateEquality(saascipeVersion1._publisherTeamId.toHexString(), data1._publisherTeamId.toHexString());
    await validateEquality(saascipeVersion1._publisherUserId.toHexString(), data1._publisherUserId.toHexString());
    await validateEquality(saascipeVersion1._saascipeId.toHexString(), data1._saascipeId.toHexString());

    const data2: any = {
      _id: mongodb.ObjectId(),
      _publisherTeamId: publisherTeamId1,
      _publisherUserId: mongodb.ObjectId(),
      _saascipeId: existingSaascipeId1,
      saascipeDef: {},
      description: "Version 2",
      runtimeVarDescriptions: [],
    };
    const saascipeVersion2: SaascipeVersionSchema = await saascipeVersionService.createSaascipeVersion(
      _teamId,
      data2,
      "saascipe_v2_correlation_id"
    );
    await expect(saascipeVersion2).toEqual(
      expect.objectContaining({
        version: 2,
        description: data2.description,
      })
    );
    await validateEquality(saascipeVersion2._id.toHexString(), data2._id.toHexString());
    await validateEquality(saascipeVersion2._publisherTeamId.toHexString(), data2._publisherTeamId.toHexString());
    await validateEquality(saascipeVersion2._publisherUserId.toHexString(), data2._publisherUserId.toHexString());
    await validateEquality(saascipeVersion2._saascipeId.toHexString(), data2._saascipeId.toHexString());
  });

  afterAll(async () => await db.clearDatabase());
});
