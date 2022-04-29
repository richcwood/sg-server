import * as config from "config";
import * as mongodb from "mongodb";
import * as _ from "lodash";

import { JobSchema } from "../domain/Job";
import { TaskSchema } from "../domain/Task";
import { TeamVariableSchema } from "../domain/TeamVariable";

import { jobService } from "../services/JobService";
import { taskService } from "../services/TaskService";

import { AMQPConnector } from "../../shared/AMQPLib";
import * as Enums from "../../shared/Enums";
import { BaseLogger } from "../../shared/SGLogger";
import { SGStrings } from "../../shared/SGStrings";
import {
  NumNotStartedTasks,
  GetWaitingForLambdaRunnerTasks,
  TaskReadyToPublish,
  GetTargetAgentId,
  GetWaitingForAgentTasks,
} from "./Shared";

import { convertData as convertResponseData } from "../utils/ResponseConverters";
import db from "../../test_helpers/DB";

import { CreateJobDefsFromTemplates, CreateTasks, CreateTeamVariables } from "../../test_helpers/TestArtifacts";
import { validateArrayLength, validateEquality } from "../../test_helpers/Validators";
import { teamVariableService } from "../services/TeamVariableService";

const testName = "Shared";

let logger;
let amqp;

beforeAll(async () => {
  await db.open();

  const amqpUrl = config.get("amqpUrl");
  const rmqVhost = config.get("rmqVhost");
  const rmqBrowserPushRoute = config.get("rmqBrowserPushRoute");

  logger = new BaseLogger(testName);
  logger.Start();

  amqp = new AMQPConnector(testName, "", amqpUrl, rmqVhost, 1, (activeMessages) => {}, logger);
  await amqp.Start();
  //   await amqp.ConsumeRoute(
  //     "",
  //     true,
  //     true,
  //     true,
  //     true,
  //     OnBrowserPush.bind(this),
  //     SGStrings.GetTeamRoutingPrefix(config.get("sgTestTeam")),
  //     rmqBrowserPushRoute
  //   );
});

// afterEach(async () => await db.clearDatabase());

afterAll(async () => await db.close());

let OnBrowserPush = async (params: any, msgKey: string, ch: any) => {
  logger.LogInfo("OnBrowserPush message", params);
};

describe("Test 'get not started tasks' functions 1", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
  const _jobId: mongodb.ObjectId = new mongodb.ObjectId();
  beforeAll(async () => {
    const tasks: Array<Partial<TaskSchema>> = [
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task 1",
        source: 1,
        target: Enums.TaskDefTarget.AWS_LAMBDA,
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task 2",
        source: 1,
        target: Enums.TaskDefTarget.AWS_LAMBDA,
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task 3",
        source: 1,
        target: 1,
        runtimeVars: {},
        status: Enums.TaskStatus.NOT_STARTED,
      },
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task 4",
        source: 1,
        target: 1,
        runtimeVars: {},
        status: Enums.TaskStatus.SUCCEEDED,
      },
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task 5",
        source: 1,
        target: 1,
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
    ];

    await CreateTasks(_teamId, tasks);
  });

  afterAll(async () => await db.clearDatabase());

  test("Test NumNotStartedTasks function", async () => {
    const numNotStartedTasks = await NumNotStartedTasks(_teamId);
    validateEquality(numNotStartedTasks, 4);
  });

  test("GetWaitingForLambdaRunnerTasks function", async () => {
    const tasksWaitingForLambda: TaskSchema[] = await GetWaitingForLambdaRunnerTasks();
    validateArrayLength(tasksWaitingForLambda, 2);
  });

  test("GetWaitingForAgentTasks function", async () => {
    const tasksWaitingForAgent: TaskSchema[] = await GetWaitingForAgentTasks(_teamId);
    validateArrayLength(tasksWaitingForAgent, 1);
  });

  test("TaskReadyToPublish with ready task", async () => {
    const task1: TaskSchema = await taskService.findTaskByName(_teamId, _jobId, "Task 1");
    const task1ReadyToStart = await TaskReadyToPublish(_teamId, task1, logger);
    validateEquality(task1ReadyToStart, true);
  });

  test("TaskReadyToPublish with not ready task", async () => {
    const task2: TaskSchema = await taskService.findTaskByName(_teamId, _jobId, "Task 4");
    const task1ReadyToStart = await TaskReadyToPublish(_teamId, task2, logger);
    validateEquality(task1ReadyToStart, true);
  });

  test("TaskReadyToPublish with invalid task", async () => {
    const task: TaskSchema = <TaskSchema>{};
    await expect(TaskReadyToPublish(_teamId, task, logger)).rejects.toThrow("Invalid task object");
  });

  test("NumNotStartedTasks with not started tasks", async () => {
    const numNotStartedTasks = await NumNotStartedTasks(_teamId);
    validateEquality(numNotStartedTasks, 4);
  });
});

describe("Test 'get not started tasks' functions 2", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
  test("NumNotStartedTasks function with no resulst", async () => {
    const numNotStartedTasks = await NumNotStartedTasks(_teamId);
    validateEquality(numNotStartedTasks, 0);
  });

  test("GetWaitingForLambdaRunnerTasks function with no results", async () => {
    const tasksWaitingForLambda: TaskSchema[] = await GetWaitingForLambdaRunnerTasks();
    validateArrayLength(tasksWaitingForLambda, 0);
  });

  test("GetWaitingForAgentTasks function with no results", async () => {
    const tasksWaitingForAgent: TaskSchema[] = await GetWaitingForAgentTasks(_teamId);
    validateArrayLength(tasksWaitingForAgent, 0);
  });
});

describe("Test republish tasks waiting for agent", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
  let job: Partial<JobSchema> = null;
  let tasks: Array<Partial<TaskSchema>> = [];
  let teamVars: Array<Partial<TeamVariableSchema>>;

  beforeAll(async () => {
    // await db.open();

    const rmqBrowserPushRoute = config.get("rmqBrowserPushRoute");
    await amqp.ConsumeRoute(
      "",
      true,
      true,
      true,
      true,
      OnBrowserPush.bind(this),
      SGStrings.GetTeamRoutingPrefix(config.get("sgTestTeam")),
      rmqBrowserPushRoute
    );

    const _jobId: mongodb.ObjectId = new mongodb.ObjectId();

    job = {
      _id: _jobId,
      runtimeVars: {
        testAgent2: {
          value: new mongodb.ObjectId().toHexString(),
        },
      },
    };

    tasks = [
      {
        _teamId: _teamId,
        _jobId: job._id,
        name: "Task 1",
        source: 1,
        target: Enums.TaskDefTarget.AWS_LAMBDA,
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
      {
        _teamId: _teamId,
        _jobId: job._id,
        name: "Task 2",
        source: 1,
        target: Enums.TaskDefTarget.AWS_LAMBDA,
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
      {
        _teamId: _teamId,
        _jobId: job._id,
        name: "Task 3",
        source: 1,
        target: Enums.TaskDefTarget.SINGLE_AGENT,
        targetAgentId: "@sgg(testAgent1)",
        runtimeVars: {},
        status: Enums.TaskStatus.NOT_STARTED,
      },
      {
        _teamId: _teamId,
        _jobId: job._id,
        name: "Task 4",
        source: 1,
        target: Enums.TaskDefTarget.SINGLE_AGENT,
        targetAgentId: "@sgg(testAgent2)",
        runtimeVars: {},
        status: Enums.TaskStatus.SUCCEEDED,
      },
      {
        _teamId: _teamId,
        _jobId: job._id,
        name: "Task 5",
        source: 1,
        target: Enums.TaskDefTarget.SINGLE_AGENT,
        targetAgentId: "@sgg(testAgent3)",
        runtimeVars: {
          testAgent3: {
            value: new mongodb.ObjectId().toHexString(),
          },
        },
      },
      {
        _teamId: _teamId,
        _jobId: job._id,
        name: "Task 6",
        source: 1,
        target: Enums.TaskDefTarget.SINGLE_AGENT,
        targetAgentId: "@sgg(testAgent4)",
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
    ];
    await CreateTasks(_teamId, tasks);

    teamVars = [
      {
        name: "testAgent1",
        value: new mongodb.ObjectId().toHexString(),
      },
    ];
    await CreateTeamVariables(_teamId, teamVars);
  });

  test("GetTargetAgentId from team var", async () => {
    const task: TaskSchema = _.filter(tasks, (t) => t.name == "Task 3")[0];
    const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
    const teamVar: TeamVariableSchema = _.filter(teamVars, (t) => t.name == "testAgent1")[0];
    const expectedAgentId = teamVar.value;
    validateEquality(agentId, expectedAgentId);
  });

  test("GetTargetAgentId from job var", async () => {
    const task: TaskSchema = _.filter(tasks, (t) => t.name == "Task 4")[0];
    const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
    const expectedAgentId = job.runtimeVars["testAgent2"]["value"];
    validateEquality(agentId, expectedAgentId);
  });

  test("GetTargetAgentId from task var", async () => {
    const task: TaskSchema = _.filter(tasks, (t) => t.name == "Task 5")[0];
    const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
    const expectedAgentId = task.runtimeVars["testAgent3"]["value"];
    validateEquality(agentId, expectedAgentId);
  });

  test("GetTargetAgentId missing", async () => {
    const task: TaskSchema = _.filter(tasks, (t) => t.name == "Task 6")[0];
    const agentId: mongodb.ObjectId = await GetTargetAgentId(_teamId, task, job, logger);
    const expectedAgentId = task.targetAgentId;
    validateEquality(agentId, expectedAgentId);
  });

  afterAll(async () => await db.clearDatabase());
});

describe("Test TaskReadyToPublish function", () => {
  let job: JobSchema;
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
  const _userId: mongodb.ObjectId = new mongodb.ObjectId();
  const script1 = `
    console.log('Hello World!');
    `;
  const properties: any = {
    scripts: [
      {
        name: "Script 1",
        scriptType: Enums.ScriptType.NODE,
        code: script1,
        shadowCopyCode: script1,
      },
    ],
    jobDefs: [
      {
        name: "Job 1",
        taskDefs: [
          {
            name: "Task 1",
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            stepDefs: [
              {
                name: "Step 1",
                scriptName: "Script 1",
              },
            ],
          },
          {
            name: "Task 2",
            target: Enums.TaskDefTarget.SINGLE_AGENT,
            fromRoutes: [["Task 1", "ok"]],
            stepDefs: [
              {
                name: "Step 1",
                scriptName: "Script 1",
              },
            ],
          },
        ],
      },
    ],
  };

  //   beforeAll(async () => {
  //     const { scripts, jobDefs } = await CreateJobDefsFromTemplates(_teamId, _userId, properties);
  //     job = await convertResponseData(
  //       JobSchema,
  //       await jobService.createJobFromJobDef(_teamId, jobDefs["Job 1"], {}, logger, amqp)
  //     );
  //   });

  //   afterAll(async () => await db.clearDatabase());
});

// describe("Re-publish tasks waiting for lambda runner agent tests", () => {
//     test("No waiting tasks", async() => {
//         const waitingTasks = await GetWaitingForLambdaRunnerTasks();
//         validateArrayLength(waitingTasks, 0);
//     });
// });
