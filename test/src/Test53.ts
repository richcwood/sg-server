import * as config from "config";
import * as TestBase from "./TestBase";
import { SGUtils } from "../../server/src/shared/SGUtils";
import {
  ScriptType,
  JobDefStatus,
  JobStatus,
  TaskDefTarget,
  TaskStatus,
  TaskFailureCode,
} from "../../server/src/shared/Enums";
import * as _ from "lodash";

const script1 = `
import time
print('start')
time.sleep(5)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

const script2 = `
import time
print('start')
time.sleep(10)
print('done')
print('@sgo{"route": "ok"}')
`;
const script2_b64 = SGUtils.btoa(script2);

let self: Test53;
const correlationId = Math.random().toFixed(5).substring(2);

export default class Test53 extends TestBase.WorkflowTestBase {
  constructor(testSetup) {
    super("Test53", testSetup);
    this.description =
      "Multi-task job - first task succeeds - interrupt job - only running task should be interrupted - restart job";

    self = this;
  }

  public async RunTest() {
    let result: boolean;
    let resApiCall: any;

    const _teamId: string = config.get("sgTestTeam");

    const properties: any = {
      scripts: [
        {
          name: "Script 53.1",
          scriptType: ScriptType.PYTHON,
          code: script1_b64,
          shadowCopyCode: script1_b64,
        },
        {
          name: "Script 53.2",
          scriptType: ScriptType.PYTHON,
          code: script2_b64,
          shadowCopyCode: script2_b64,
        },
      ],
      jobDefs: [
        {
          name: "Job 53",
          misfireGraceTime: 1,
          taskDefs: [
            {
              name: "Task 1",
              target: TaskDefTarget.SINGLE_AGENT,
              stepDefs: [
                {
                  name: "Step 1",
                  scriptName: "Script 53.1",
                },
              ],
            },
            {
              name: "Task 2",
              target: TaskDefTarget.SINGLE_AGENT,
              fromRoutes: [["Task 1", "ok"]],
              stepDefs: [
                {
                  name: "Step 1",
                  scriptName: "Script 53.2",
                },
              ],
            },
          ],
        },
      ],
    };

    const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(
      properties
    );

    let job;
    resApiCall = await this.testSetup.RestAPICall(`job`, "POST", _teamId, {
      _jobDefId: jobDefs["Job 53"].id,
      correlationId: correlationId,
    });
    if (resApiCall.data.statusCode != 201) {
      self.logger.LogError("Failed", {
        Message: `job POST returned ${resApiCall.data.statusCode}`,
        _jobDefId: jobDefs["Job 53"].id,
      });
      return false;
    }

    job = resApiCall.data.data;

    const jobStartedBP: any = {
      domainType: "Job",
      operation: 1,
      model: {
        _teamId: config.get("sgTestTeam"),
        _jobDefId: jobDefs[properties.jobDefs[0].name].id,
        runId: 0,
        name: properties.jobDefs[0].name,
        status: 0,
        id: job.id,
        type: "Job",
      },
      correlationId: correlationId,
    };
    self.bpMessagesExpected.push(jobStartedBP);

    const task1CreatedBP: any = {
      domainType: "Task",
      operation: 1,
      model: {
        _teamId: config.get("sgTestTeam"),
        _jobId: job.id,
        source: 1,
        target: TaskDefTarget.SINGLE_AGENT,
        autoRestart: false,
        name: "Task 1",
        type: "Task",
      },
      correlationId: correlationId,
    };
    self.bpMessagesExpected.push(task1CreatedBP);

    const task2CreatedBP: any = {
      domainType: "Task",
      operation: 1,
      model: {
        _teamId: config.get("sgTestTeam"),
        _jobId: job.id,
        source: 1,
        target: TaskDefTarget.SINGLE_AGENT,
        autoRestart: false,
        name: "Task 2",
        type: "Task",
      },
      correlationId: correlationId,
    };
    self.bpMessagesExpected.push(task2CreatedBP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const task1Qry = _.filter(
      self.bpMessages,
      (x) =>
        x.domainType == "Task" &&
        x.operation == 1 &&
        x.model._jobId == job.id &&
        x.model.name == "Task 1"
    );
    if (task1Qry.length < 1) {
      throw new Error(
        `Unable to find Task - {operation: 1, _jobId: ${job.id}, name: "Task 1"}`
      );
    }
    const task1: any = task1Qry[0].model;

    const task2Qry = _.filter(
      self.bpMessages,
      (x) =>
        x.domainType == "Task" &&
        x.operation == 1 &&
        x.model._jobId == job.id &&
        x.model.name == "Task 2"
    );
    if (task1Qry.length < 1) {
      throw new Error(
        `Unable to find Task - {operation: 1, _jobId: ${job.id}, name: "Task 2"}`
      );
    }
    const task2: any = task2Qry[0].model;

    const taskOutcomeCreatedTask1BP: any = {
      domainType: "TaskOutcome",
      operation: 1,
      model: {
        _teamId: _teamId,
        _jobId: job.id,
        _taskId: task1.id,
        source: 1,
        status: TaskStatus.PUBLISHED,
        target: TaskDefTarget.SINGLE_AGENT,
        autoRestart: false,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskOutcomeCreatedTask1BP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const taskOutcome1Qry = _.filter(
      self.bpMessages,
      (x) =>
        x.domainType == "TaskOutcome" &&
        x.operation == 1 &&
        x.model._jobId == job.id &&
        x.model._taskId == task1.id
    );
    if (taskOutcome1Qry.length < 1) {
      throw new Error(
        `Unable to find TaskOutcome - {operation: 1, _jobId: ${job.id}, _taskId: ${task1.id}}`
      );
    }
    const taskOutcome1: any = taskOutcome1Qry[0].model;

    const taskResultCompleteTask1BP: any = {
      domainType: "TaskOutcome",
      operation: 2,
      model: {
        status: TaskStatus.SUCCEEDED,
        route: "ok",
        id: taskOutcome1.id,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskResultCompleteTask1BP);

    const taskOutcomeCreatedTask2BP: any = {
      domainType: "TaskOutcome",
      operation: 1,
      model: {
        _teamId: _teamId,
        _jobId: job.id,
        _taskId: task2.id,
        source: 1,
        status: TaskStatus.PUBLISHED,
        target: TaskDefTarget.SINGLE_AGENT,
        autoRestart: false,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskOutcomeCreatedTask2BP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const taskOutcome2Qry = _.filter(
      self.bpMessages,
      (x) =>
        x.domainType == "TaskOutcome" &&
        x.operation == 1 &&
        x.model._jobId == job.id &&
        x.model._taskId == task2.id
    );
    if (taskOutcome2Qry.length < 1) {
      throw new Error(
        `Unable to find TaskOutcome - {operation: 1, _jobId: ${job.id}, _taskId: ${task2.id}}`
      );
    }
    const taskOutcome2: any = taskOutcome2Qry[0].model;

    resApiCall = await this.testSetup.RestAPICall(
      `jobaction/interrupt/${job.id}`,
      "POST",
      _teamId,
      null
    );
    if (resApiCall.data.statusCode != 200) {
      self.logger.LogError("Failed", {
        Message: `jobaction/interrupt/${job.id} POST returned ${resApiCall.data.statusCode}`,
      });
      return false;
    }

    const jobInterruptingBP: any = {
      domainType: "Job",
      operation: 2,
      model: {
        status: JobStatus.INTERRUPTING,
        id: job.id,
        type: "Job",
      },
    };
    self.bpMessagesExpected.push(jobInterruptingBP);

    const jobInterruptedBP: any = {
      domainType: "Job",
      operation: 2,
      model: {
        status: JobStatus.INTERRUPTED,
        id: job.id,
        type: "Job",
      },
    };
    self.bpMessagesExpected.push(jobInterruptedBP);

    const taskResultInterruptedTask2BP: any = {
      domainType: "TaskOutcome",
      operation: 2,
      model: {
        status: TaskStatus.INTERRUPTED,
        route: "interrupt",
        id: taskOutcome2.id,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskResultInterruptedTask2BP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const taskResultNotInterruptedTask1BP: any = {
      neg: true,
      domainType: "TaskOutcome",
      operation: 2,
      model: {
        status: TaskStatus.INTERRUPTED,
        route: "interrupt",
        id: taskOutcome1.id,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskResultNotInterruptedTask1BP);

    result = await self.WaitForTestToComplete(5000);
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    resApiCall = await this.testSetup.RestAPICall(
      `jobaction/restart/${job.id}`,
      "POST",
      _teamId,
      null
    );
    if (resApiCall.data.statusCode != 200) {
      self.logger.LogError("Failed", {
        Message: `jobaction/restart/${job.id} POST returned ${resApiCall.data.statusCode}`,
      });
      return false;
    }

    const jobRestartedBP: any = {
      domainType: "Job",
      operation: 2,
      model: {
        status: JobStatus.RUNNING,
        id: job.id,
        type: "Job",
      },
    };
    self.bpMessagesExpected.push(jobRestartedBP);

    const taskResultCanceledTask2BP: any = {
      domainType: "TaskOutcome",
      operation: 2,
      model: {
        status: TaskStatus.CANCELLED,
        id: taskOutcome2.id,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskResultCanceledTask2BP);

    const taskOutcomeNewCreatedTask2BP: any = {
      domainType: "TaskOutcome",
      operation: 1,
      model: {
        _teamId: _teamId,
        _jobId: job.id,
        _taskId: task2.id,
        source: 1,
        status: TaskStatus.PUBLISHED,
        target: TaskDefTarget.SINGLE_AGENT,
        autoRestart: false,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskOutcomeNewCreatedTask2BP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const taskResultRestartedTask1BP: any = {
      neg: true,
      domainType: "TaskOutcome",
      operation: 2,
      model: {
        status: TaskStatus.PUBLISHED,
        id: taskOutcome1.id,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskResultRestartedTask1BP);

    result = await self.WaitForTestToComplete(5000);
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const jobCompletedBP: any = {
      domainType: "Job",
      operation: 2,
      model: {
        status: JobStatus.COMPLETED,
        id: job.id,
        type: "Job",
      },
    };
    self.bpMessagesExpected.push(jobCompletedBP);

    const taskResultCompletedTask2BP: any = {
      domainType: "TaskOutcome",
      operation: 2,
      model: {
        status: TaskStatus.SUCCEEDED,
        route: "ok",
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskResultCompletedTask2BP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    return true;
  }
}
