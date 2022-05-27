import * as config from "config";
import * as mongodb from "mongodb";
import * as _ from "lodash";

import { AgentSchema } from "../domain/Agent";

import { agentService } from "./AgentService";

import { AMQPConnector } from "../../shared/AMQPLib";
import * as Enums from "../../shared/Enums";
import { BaseLogger } from "../../shared/SGLogger";

import db from "../../test_helpers/DB";

import { CreateAgents } from "../../test_helpers/TestArtifacts";

const testName = "AgentService";

let logger;
let amqp;

beforeAll(async () => {
  await db.open();

  logger = new BaseLogger(testName);
  logger.Start();
});

afterAll(async () => await db.close());

let OnBrowserPush = async (params: any, msgKey: string, ch: any) => {
  logger.LogInfo("OnBrowserPush message", params);
};

describe("Agent service tests", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
  const leastUtilizedAgentId = new mongodb.ObjectId();
  const offlineAgentId1 = new mongodb.ObjectId();
  const offlineAgentId2 = new mongodb.ObjectId();
  let agents: Array<Partial<AgentSchema>> = [];
  const tags1: any = { tag1: "val1" };
  const tags2: any = { tag1: "val1", tag2: "val2" };
  const tags3: any = { tag3: "val3" };

  beforeAll(async () => {
    const previousAttemptAgentId = new mongodb.ObjectId();
    agents = [
      {
        _id: new mongodb.ObjectId(),
        machineId: "agent1",
        targetVersion: "v1",
        reportedVersion: "v1",
        ipAddress: "ipAddress",
        propertyOverrides: {
          maxActiveTasks: 10,
        },
        numActiveTasks: 10,
        lastTaskAssignedTime: Date.now() - 60 * 1000,
        lastHeartbeatTime: Date.now() - 60 * 1000,
        tags: tags1,
      },
      {
        _id: new mongodb.ObjectId(),
        machineId: "agent2",
        targetVersion: "v1",
        reportedVersion: "v1",
        ipAddress: "ipAddress",
        propertyOverrides: {
          maxActiveTasks: 10,
        },
        numActiveTasks: 5,
        lastTaskAssignedTime: Date.now() - 60 * 1000,
        lastHeartbeatTime: Date.now() - 50 * 1000,
        tags: tags1,
      },
      {
        _id: new mongodb.ObjectId(),
        machineId: "agent3",
        targetVersion: "v1",
        reportedVersion: "v1",
        ipAddress: "ipAddress",
        propertyOverrides: {
          maxActiveTasks: 10,
        },
        numActiveTasks: 5,
        lastTaskAssignedTime: Date.now() - 5 * 60 * 1000,
        lastHeartbeatTime: Date.now() - 30 * 1000,
        tags: tags2,
      },
      {
        _id: leastUtilizedAgentId,
        machineId: "agent4",
        targetVersion: "v1",
        reportedVersion: "v1",
        ipAddress: "ipAddress",
        propertyOverrides: {
          maxActiveTasks: 10,
        },
        numActiveTasks: 5,
        lastTaskAssignedTime: Date.now() - 5 * 60 * 1000,
        lastHeartbeatTime: Date.now() - 4 * 60 * 1000,
        tags: tags2,
      },
      {
        _id: previousAttemptAgentId,
        machineId: "agent5",
        targetVersion: "v1",
        reportedVersion: "v1",
        ipAddress: "ipAddress",
        propertyOverrides: {
          maxActiveTasks: 10,
        },
        numActiveTasks: 4,
        lastTaskAssignedTime: Date.now() - 5 * 60 * 1000,
        lastHeartbeatTime: Date.now() - 30 * 1000,
        tags: tags3,
      },
      {
        _id: offlineAgentId1,
        machineId: "agent6",
        targetVersion: "v1",
        reportedVersion: "v1",
        ipAddress: "ipAddress",
        offline: true,
        propertyOverrides: {
          maxActiveTasks: 10,
        },
        numActiveTasks: 0,
        lastTaskAssignedTime: Date.now() - 60 * 60 * 1000,
        lastHeartbeatTime: Date.now() - 2 * 60 * 1000,
        tags: tags1,
      },
      {
        _id: offlineAgentId2,
        machineId: "agent7",
        targetVersion: "v1",
        reportedVersion: "v1",
        ipAddress: "ipAddress",
        propertyOverrides: {
          maxActiveTasks: 10,
        },
        numActiveTasks: 0,
        lastTaskAssignedTime: Date.now() - 60 * 60 * 1000,
        lastHeartbeatTime: Date.now() - 2 * 60 * 1000,
        tags: tags2,
      },
    ];
    await CreateAgents(_teamId, agents);
  });

  test("findActiveAgentsWithTags invalid tags test", async () => {
    await expect(agentService.findActiveAgentsWithTags(_teamId, {}, "")).rejects.toThrow("Missing or invalid tags");
  });

  test("findActiveAgentsWithTags test 1", async () => {
    const activeAgentsWithTags = await agentService.findActiveAgentsWithTags(_teamId, tags1, "");
    expect(activeAgentsWithTags).toHaveLength(3);
    expect(activeAgentsWithTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          machineId: "agent1",
        }),
        expect.objectContaining({
          machineId: "agent2",
        }),
        expect.objectContaining({
          machineId: "agent3",
        }),
        expect.not.objectContaining({
          machineId: "agent5",
        }),
        expect.not.objectContaining({
          machineId: "agent4",
        }),
        expect.not.objectContaining({
          machineId: "agent6",
        }),
        expect.not.objectContaining({
          machineId: "agent7",
        }),
      ])
    );
  });

  test("findActiveAgentsWithTags test 2", async () => {
    const activeAgentsWithTags = await agentService.findActiveAgentsWithTags(_teamId, tags2, "");
    expect(activeAgentsWithTags).toHaveLength(1);
    expect(activeAgentsWithTags).toEqual(
      expect.arrayContaining([
        expect.not.objectContaining({
          machineId: "agent1",
        }),
        expect.not.objectContaining({
          machineId: "agent2",
        }),
        expect.objectContaining({
          machineId: "agent3",
        }),
        expect.not.objectContaining({
          machineId: "agent5",
        }),
        expect.not.objectContaining({
          machineId: "agent4",
        }),
        expect.not.objectContaining({
          machineId: "agent6",
        }),
        expect.not.objectContaining({
          machineId: "agent7",
        }),
      ])
    );
  });

  test("findActiveAgentsWithTags test 3", async () => {
    const activeAgentsWithTags = await agentService.findActiveAgentsWithTags(_teamId, tags3, "");
    expect(activeAgentsWithTags).toHaveLength(1);
    expect(activeAgentsWithTags).toEqual(
      expect.arrayContaining([
        expect.not.objectContaining({
          machineId: "agent1",
        }),
        expect.not.objectContaining({
          machineId: "agent2",
        }),
        expect.not.objectContaining({
          machineId: "agent3",
        }),
        expect.objectContaining({
          machineId: "agent5",
        }),
        expect.not.objectContaining({
          machineId: "agent4",
        }),
        expect.not.objectContaining({
          machineId: "agent6",
        }),
        expect.not.objectContaining({
          machineId: "agent7",
        }),
      ])
    );
  });

  afterAll(async () => await db.clearDatabase());
});
