import * as mongodb from "mongodb";
import * as _ from "lodash";

import {SaascipeSchema} from "../domain/Saascipe";
import {saascipeService} from "./SaascipeService";
import {SaascipeType} from "../../shared/Enums";
import {BaseLogger} from "../../shared/SGLogger";

import db from "../../test_helpers/DB";

import {CreateSaascipes} from "../../test_helpers/TestArtifacts";
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

describe("Saascipe service tests", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();

  const existingSaascipeId1 = new mongodb.ObjectId();
  const publisherTeamId1 = new mongodb.ObjectId();
  const existingSaascipeId2 = new mongodb.ObjectId();
  const publisherTeamId2 = new mongodb.ObjectId();
  let saascipes: Array<Partial<SaascipeSchema>> = [];

  beforeAll(async () => {
    saascipes = [
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
    await CreateSaascipes(_teamId, saascipes);
  });

  test("Create saascipe test", async () => {
    const data: any = {
      _id: mongodb.ObjectId(),
      _publisherTeamId: mongodb.ObjectId(),
      _publisherUserId: mongodb.ObjectId(),
      _sourceId: mongodb.ObjectId(),
      name: "New Saascipe",
      saascipeType: SaascipeType.JOB,
      description: "A really sweet Saascipe",
    };
    const saascipe: SaascipeSchema = await saascipeService.createSaascipe(_teamId, data, "test1_correlation_id");
    await expect(saascipe).toEqual(
      expect.objectContaining({
        name: data.name,
        saascipeType: data.saascipeType,
        description: data.description,
        currentVersion: 0,
      })
    );
    await validateEquality(saascipe._id.toHexString(), data._id.toHexString());
    await validateEquality(saascipe._publisherTeamId.toHexString(), data._publisherTeamId.toHexString());
    await validateEquality(saascipe._publisherUserId.toHexString(), data._publisherUserId.toHexString());
    await validateEquality(saascipe._sourceId.toHexString(), data._sourceId.toHexString());
  });

  test("Create saascipe test duplicate fail", async () => {
    const data: any = {
      _id: mongodb.ObjectId(),
      _publisherTeamId: publisherTeamId2,
      _publisherUserId: mongodb.ObjectId(),
      _sourceId: mongodb.ObjectId(),
      name: "Saascipe1",
      saascipeType: SaascipeType.JOB,
      description: "Saascipe1 duplicate",
    };
    await expect(saascipeService.createSaascipe(_teamId, data, "test2_correlation_id")).rejects.toThrow(
      `Saascipe "${data.name}" already exists`
    );
  });

  afterAll(async () => await db.clearDatabase());
});
