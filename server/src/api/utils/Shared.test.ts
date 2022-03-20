import * as mongodb from "mongodb";

import { JobSchema } from "../domain/Job";
import { TaskSchema } from "../domain/Task";
import { jobService } from "../services/JobService";
import { AMQPConnector } from "../../shared/AMQPLib";
import { BaseLogger } from "../../shared/SGLogger";
import { SGStrings } from "../../shared/SGStrings";
import { NumNotStartedTasks, GetWaitingForLambdaRunnerTasks, TaskReadyToStart } from "./Shared";
import { convertData as convertResponseData } from "../utils/ResponseConverters";
import db from "../../test_helpers/DB";
import { CreateJobDefsFromTemplates, CreateTasks } from "../../test_helpers/TestArtifacts";
import { validateArrayLength, validateEquality } from "../../test_helpers/Validators";

import * as config from "config";
import * as Enums from "../../shared/Enums";
import { taskService } from "../services/TaskService";

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
  beforeAll(async () => {
    const _jobId: mongodb.ObjectId = new mongodb.ObjectId("6223e93e6f2b00e5f916160a");
    const tasks: Array<Partial<TaskSchema>> = [
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task1",
        source: 1,
        target: Enums.TaskDefTarget.AWS_LAMBDA,
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task1",
        source: 1,
        target: Enums.TaskDefTarget.AWS_LAMBDA,
        runtimeVars: {},
        status: Enums.TaskStatus.WAITING_FOR_AGENT,
      },
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task1",
        source: 1,
        target: 1,
        runtimeVars: {},
        status: Enums.TaskStatus.NOT_STARTED,
      },
      {
        _teamId: _teamId,
        _jobId: _jobId,
        name: "Task1",
        source: 1,
        target: 1,
        runtimeVars: {},
        status: Enums.TaskStatus.SUCCEEDED,
      },
    ];

    await CreateTasks(_teamId, tasks);
  });

  afterAll(async () => await db.clearDatabase());

  test("Test NumNotStartedTasks function", async () => {
    const numNotStartedTasks = await NumNotStartedTasks(_teamId);
    validateEquality(numNotStartedTasks, 3);
  });

  test("Test GetWaitingForLambdaRunnerTasks function", async () => {
    const tasksWaitingForLambda: TaskSchema[] = await GetWaitingForLambdaRunnerTasks();
    validateArrayLength(tasksWaitingForLambda, 2);
  });
});

describe("Test 'get not started tasks' functions 2", () => {
  const _teamId: mongodb.ObjectId = new mongodb.ObjectId();
  test("Test NumNotStartedTasks function", async () => {
    const numNotStartedTasks = await NumNotStartedTasks(_teamId);
    validateEquality(numNotStartedTasks, 0);
  });

  test("Test GetWaitingForLambdaRunnerTasks function with no results", async () => {
    const tasksWaitingForLambda: TaskSchema[] = await GetWaitingForLambdaRunnerTasks();
    validateArrayLength(tasksWaitingForLambda, 0);
  });
});

describe("Test TaskReadyToStart function", () => {
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

  beforeAll(async () => {
    const { scripts, jobDefs } = await CreateJobDefsFromTemplates(_teamId, _userId, properties);
    job = await convertResponseData(
      JobSchema,
      await jobService.createJobFromJobDef(_teamId, jobDefs["Job 1"], {}, logger, amqp)
    );
  });

  afterAll(async () => await db.clearDatabase());

  test("Test TaskReadyToStart with ready task", async () => {
    const task1: TaskSchema = await taskService.findTaskByName(_teamId, job.id, "Task 1");
    const task1ReadyToStart = await TaskReadyToStart(_teamId, task1);
    validateEquality(task1ReadyToStart, true);
  });

  test("Test TaskReadyToStart with not ready task", async () => {
    const task2: TaskSchema = await taskService.findTaskByName(_teamId, job.id, "Task 2");
    const task1ReadyToStart = await TaskReadyToStart(_teamId, task2);
    validateEquality(task1ReadyToStart, true);
  });
});

// describe("Re-publish tasks waiting for lambda runner agent tests", () => {
//     test("No waiting tasks", async() => {
//         const waitingTasks = await GetWaitingForLambdaRunnerTasks();
//         validateArrayLength(waitingTasks, 0);
//     });
// });
