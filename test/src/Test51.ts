import * as config from "config";
import * as TestBase from "./TestBase";
import { SGUtils } from "../../server/src/shared/SGUtils";
import { ScriptType, JobDefStatus, JobStatus, TaskStatus, TaskFailureCode } from "../../server/src/shared/Enums";
import * as _ from "lodash";
import { TaskDefTarget } from "../../server/src/shared/Enums";
const mongoose = require("mongoose");

const script1 = `
import time
import sys
print('start')
for i in range(1000):
    time.sleep(5)
print('done')
print('@sgo{"route": "ok"}')
`;
const script1_b64 = SGUtils.btoa(script1);

let self: Test51;
const correlationId = Math.random().toFixed(5).substring(2);

export default class Test51 extends TestBase.WorkflowTestBase {
  constructor(testSetup) {
    super("Test51", testSetup);
    this.description =
      "Auto restart tasks test - client disconnected, run orphaned tasks script, should restart on another agent";

    self = this;
  }

  public ProcessOrphanedTasks = async () => {
    try {
      let res = await self.Login(config.get("agentAccessKeyId"), config.get("agentAccessKeySecret"));
      let tmp = res[0].split(";");
      let auth = tmp[0];
      auth = auth.substring(5) + ";";

      // mongoose.connect(config.get('mongoUrl'), {});

      /// To prevent a run away process - if we have tons of orphaned tasks it may be an indicator of a problem with SaaSGlue itself
      const maxOfflineAgentsToProcess = 10;
      let cntOfflineAgentsProcessed = 0;

      const __ACTIVE_AGENT_TIMEOUT_SECONDS = 10;
      console.log("__ACTIVE_AGENT_TIMEOUT_SECONDS -> ", __ACTIVE_AGENT_TIMEOUT_SECONDS);

      while (true) {
        let disconnectedAgentsQuery;
        try {
          disconnectedAgentsQuery = await self.testSetup.RestAPICall(
            "agent/disconnected/disconnected?responseFields=id _teamId",
            "GET",
            config.get("sgTestTeam"),
            { batchSize: 10 },
            null,
            auth
          );
          if (disconnectedAgentsQuery.statusCode == 404) break;
        } catch (err) {
          if (err.message.indexOf("Request failed with status code 404") >= 0) {
            break;
          } else {
            throw err;
          }
        }
        console.log("inactiveAgentsQuery -> ", disconnectedAgentsQuery.data);
        const inactiveAgents = disconnectedAgentsQuery.data.data;

        if (inactiveAgents.length > 0) {
          for (let i = 0; i < inactiveAgents.length; i++) {
            const agent = inactiveAgents[i];
            console.log("agent -> ", agent);

            let cancelRes = await this.testSetup.RestAPICall(
              "agent/cancelorphanedtasks/" + agent.id,
              "POST",
              agent._teamId,
              null,
              null,
              auth
            );
            console.log("cancelRes -> ", cancelRes.data);

            cntOfflineAgentsProcessed += 1;
            if (cntOfflineAgentsProcessed >= maxOfflineAgentsToProcess) {
              console.log("Reached max number of offline agents - exiting");
              process.exit(-1);
            }
          }
        } else {
          break;
        }
      }
      process.exit(0);
    } catch (err) {
      console.log("Error processing orphaned tasks: ", err.message);
      // process.exit(-1);
    }
  };

  public async RunTest() {
    let result: boolean;
    let resApiCall: any;

    const _teamId: string = config.get("sgTestTeam");

    const properties: any = {
      scripts: [
        {
          name: "Script 51",
          scriptType: ScriptType.PYTHON,
          code: script1_b64,
          shadowCopyCode: script1_b64,
        },
      ],
      jobDefs: [
        {
          name: "Job 51",
          taskDefs: [
            {
              name: "Task 1",
              autoRestart: true,
              stepDefs: [
                {
                  name: "Step 1",
                  scriptName: "Script 51",
                },
              ],
            },
          ],
        },
      ],
    };

    const { scripts, jobDefs } = await this.CreateJobDefsFromTemplates(properties);

    resApiCall = await self.testSetup.RestAPICall(`job`, "POST", _teamId, {
      _jobDefId: jobDefs["Job 51"].id,
      correlationId: correlationId,
    });
    if (resApiCall.data.statusCode != 201) {
      self.logger.LogError("Failed", {
        Message: `job POST returned ${resApiCall.data.statusCode}`,
        _jobDefId: jobDefs["Job 51"].id,
      });
      return false;
    }
    const job = resApiCall.data.data;

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

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const taskCreatedBP: any = {
      domainType: "Task",
      operation: 1,
      model: {
        status: null,
        autoRestart: true,
        _teamId: config.get("sgTestTeam"),
        _jobId: job.id,
        name: properties.jobDefs[0].taskDefs[0].name,
        target: TaskDefTarget.SINGLE_AGENT,
        source: 1,
        type: "Task",
      },
      correlationId: correlationId,
    };
    self.bpMessagesExpected.push(taskCreatedBP);

    const taskOutcomeCreatedBP: any = {
      domainType: "TaskOutcome",
      operation: 1,
      model: {
        _teamId: config.get("sgTestTeam"),
        _jobId: job.id,
        source: 1,
        status: TaskStatus.PUBLISHED,
        target: TaskDefTarget.SINGLE_AGENT,
        autoRestart: true,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskOutcomeCreatedBP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const task = _.filter(
      self.bpMessages,
      (x) => x.domainType == "Task" && x.operation == 1 && x.model._jobId == job.id
    );
    if (task.length < 1) {
      throw new Error(`Unable to find Task - {operation: 1, _jobId: ${job.id}}`);
    }

    const taskOutcome = _.filter(
      self.bpMessages,
      (x) => x.domainType == "TaskOutcome" && x.operation == 1 && x.model._taskId == task[0].model.id
    );
    if (taskOutcome.length < 1) {
      throw new Error(`Unable to find TaskOutcome - {operation: 1, _taskId: ${task[0].model.id}}`);
    }

    const stepOutcomeCreatedBP: any = {
      domainType: "StepOutcome",
      operation: 1,
      model: {
        _teamId: config.get("sgTestTeam"),
        _jobId: job.id,
        _taskOutcomeId: taskOutcome[0].model.id,
        name: "Step 1",
        source: 1,
        status: 10,
        type: "StepOutcome",
      },
    };
    self.bpMessagesExpected.push(stepOutcomeCreatedBP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const stepOutcome = _.filter(
      self.bpMessages,
      (x) => x.domainType == "StepOutcome" && x.operation == 1 && x.model._taskOutcomeId == taskOutcome[0].model.id
    );
    if (stepOutcome.length < 1) {
      throw new Error(`Unable to find StepOutcome - {operation: 1, _taskOutcomeId: ${taskOutcome[0].model.id}}`);
    }

    let agents = _.filter(self.testSetup.agents, (a) => a.instanceId.toHexString() == taskOutcome[0].model._agentId);
    await agents[0].Stop();

    for (let i = 0; i < 75; i++) await SGUtils.sleep(1000);

    await self.ProcessOrphanedTasks();

    const stepInterruptedBP: any = {
      domainType: "StepOutcome",
      operation: 2,
      model: {
        status: TaskStatus.INTERRUPTED,
        id: stepOutcome[0].model.id,
        type: "StepOutcome",
      },
    };
    self.bpMessagesExpected.push(stepInterruptedBP);

    const taskOutcomeInterruptedBP: any = {
      domainType: "TaskOutcome",
      operation: 2,
      model: {
        status: TaskStatus.CANCELLED,
        failureCode: TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY,
        id: taskOutcome[0].model.id,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(taskOutcomeInterruptedBP);

    // const taskWaitingForAgentBP: any = {
    //     domainType: 'Task',
    //     operation: 2,
    //     model:
    //     {
    //         status: TaskStatus.WAITING_FOR_AGENT,
    //         failureCode: TaskFailureCode.NO_AGENT_AVAILABLE,
    //         id: task[0].model.id,
    //         type: 'Task'
    //     }
    // };
    // self.bpMessagesExpected.push(taskWaitingForAgentBP);

    const jobCompletedBP: any = {
      domainType: "Job",
      operation: 2,
      model: {
        status: JobStatus.COMPLETED,
        id: job.id,
        type: "Job",
      },
      correlationId: null,
    };
    self.bpMessagesExpected.push(jobCompletedBP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const newTaskOutcomeCreatedBP: any = {
      domainType: "TaskOutcome",
      operation: 1,
      model: {
        _teamId: config.get("sgTestTeam"),
        _jobId: job.id,
        source: 1,
        status: TaskStatus.PUBLISHED,
        target: TaskDefTarget.SINGLE_AGENT,
        autoRestart: true,
        type: "TaskOutcome",
      },
    };
    self.bpMessagesExpected.push(newTaskOutcomeCreatedBP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    const newTaskOutcome = _.filter(
      self.bpMessages,
      (x) =>
        x.domainType == "TaskOutcome" &&
        x.operation == 1 &&
        x.model._taskId == task[0].model.id &&
        x.model.id != taskOutcome[0].model.id
    );
    if (newTaskOutcome.length < 1) {
      throw new Error(`Unable to find TaskOutcome - {operation: 1, _taskId: ${task[0].model.id}}`);
    }

    const newStepOutcomeCreatedBP: any = {
      domainType: "StepOutcome",
      operation: 1,
      model: {
        _teamId: config.get("sgTestTeam"),
        _jobId: job.id,
        _taskOutcomeId: newTaskOutcome[0].model.id,
        name: "Step 1",
        source: 1,
        status: 10,
        type: "StepOutcome",
      },
    };
    self.bpMessagesExpected.push(newStepOutcomeCreatedBP);

    const jobRestartedBP: any = {
      domainType: "Job",
      operation: 2,
      model: {
        status: JobStatus.RUNNING,
        id: job.id,
        type: "Job",
      },
      correlationId: null,
    };
    self.bpMessagesExpected.push(jobRestartedBP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;

    agents[0].offline = false;
    agents[0].stopped = false;
    await agents[0].Init();

    await self.testSetup.RestAPICall(
      `jobaction/cancel/${job.id}`,
      "POST",
      _teamId,
      { correlationId: correlationId },
      null
    );

    const jobCompleteBP: any = {
      domainType: "Job",
      operation: 2,
      model: {
        status: JobStatus.COMPLETED,
        id: job.id,
        type: "Job",
      },
    };
    self.bpMessagesExpected.push(jobCompleteBP);

    result = await self.WaitForTestToComplete();
    if (!result) return result;
    self.bpMessagesExpected.length = 0;

    return true;
  }
}
