import * as _ from "lodash";
import * as moment from "moment";
import * as mongodb from "mongodb";

import { AgentSchema } from "../api/domain/Agent";
import { JobSchema } from "../api/domain/Job";
import { JobDefSchema } from "../api/domain/JobDef";
import { ScriptSchema } from "../api/domain/Script";
import { StepDefSchema } from "../api/domain/StepDef";
import { TaskSchema } from "../api/domain/Task";
import { TaskDefSchema } from "../api/domain/TaskDef";
import { TeamVariableSchema } from "../api/domain/TeamVariable";

import { agentService } from "../api/services/AgentService";
import { jobService } from "../api/services/JobService";
import { jobDefService } from "../api/services/JobDefService";
import { scriptService } from "../api/services/ScriptService";
import { stepDefService } from "../api/services/StepDefService";
import { taskService } from "../api/services/TaskService";
import { taskDefService } from "../api/services/TaskDefService";
import { teamVariableService } from "../api/services/TeamVariableService";

import { convertData as convertResponseData } from "../api/utils/ResponseConverters";

import { AMQPConnector } from "../shared/AMQPLib";
import { SGUtils } from "../shared/SGUtils";

import { validateArrayLengthLessThanOrEqual } from "./Validators";

import * as config from "config";
import { TaskSource } from "../shared/Enums";
import { BaseLogger } from "../shared/SGLogger";

let LongRunningJob: any = {
  job: {
    name: "RunLongRunningScript",
    tasks: [
      {
        name: "Task1",
        source: 0,
        requiredTags: [],
        target: 1,
        autoRestart: false,
        dependsOn: [],
        steps: [
          {
            name: "Step1",
            script: {
              scriptType: "PYTHON",
              code: "aW1wb3J0IHN5cwppbXBvcnQgdGltZQpwcmludCgnc3RhcnQnKQpjbnQgPSAwCndoaWxlKFRydWUpOgogIHRpbWUuc2xlZXAoNSkKICBwcmludCgnbG9vcCB7fScuZm9ybWF0KGNudCkpCiAgc3lzLnN0ZG91dC5mbHVzaCgpCiAgY250ICs9IDEKcHJpbnQoJ2RvbmUnKQpwcmludCgnQHNnb3sicm91dGUiOiAib2sifScp",
            },
            order: 0,
            arguments: "",
            variables: "",
          },
        ],
        correlationId: "1",
      },
    ],
  },
};
export { LongRunningJob };

let InteractiveConsoleJob: any = {
  job: {
    name: `IC-${moment().format("dddd MMM DD h:m a")}`,
    runtimeVars: {},
    tasks: [
      {
        name: "Task1",
        source: 0,
        requiredTags: {},
        target: 16,
        targetAgentId: "",
        fromRoutes: [],
        steps: [
          {
            name: "Step1",
            script: {
              code: "aW1wb3J0IHRpbWUKcHJpbnQoJ3N0YXJ0JykKdGltZS5zbGVlcCg1KQpwcmludCgnZG9uZScpCnByaW50KCdAc2dveyJyb3V0ZSI6ICJvayJ9Jyk=",
            },
            order: 0,
            command: "",
            arguments: "",
            variables: {},
          },
        ],
        correlationId: "885109692",
      },
    ],
  },
};
export { InteractiveConsoleJob };

let ScriptTemplate: any = {
  name: "Script 1",
  scriptType: "2",
  code: "ZWNobyAiSGVsbG8gV29ybGQi",
  shadowCopyCode: "ZWNobyAiSGVsbG8gV29ybGQi",
};
export { ScriptTemplate };

let JobDefTemplate: any = {
  Name: "Job 1",
  createdBy: mongodb.ObjectId(),
  runtimeVars: {},
};
export { JobDefTemplate };

let TaskDefTemplate: any = {
  name: "Task 1",
  requiredTags: [],
  dependsOn: [],
  target: 1,
};
export { TaskDefTemplate };

let StepDefTemplate: any = {
  name: "Step 1",
  order: "0",
  arguments: "",
  variables: "",
};
export { StepDefTemplate };

/**
 * Creates a script schema with the given json formatted properties
 * @param _teamId
 * @param _userId
 * @param properties
 * @returns {Promise<ScriptSchema>}
 */
let CreateScriptFromTemplate = async (
  _teamId: mongodb.ObjectId,
  _userId: mongodb.ObjectId,
  properties: any
): Promise<ScriptSchema> => {
  let scriptTemplate: ScriptSchema = _.clone(ScriptTemplate);
  const scriptCodeB64: string = SGUtils.btoa(scriptTemplate.code);
  scriptTemplate.code = scriptCodeB64;
  scriptTemplate.shadowCopyCode = scriptCodeB64;
  Object.assign(scriptTemplate, properties);
  return await scriptService.createScript(_teamId, scriptTemplate, _userId, "");
};

/**
 * Creates a jobdef schema with the given json formatted properties
 * @param _teamId
 * @param properties
 * @returns {Promise<JobDefSchema>}
 */
let CreateJobDefFromTemplate = async (_teamId: mongodb.ObjectId, properties: any): Promise<JobDefSchema> => {
  let jobDefTemplate: JobDefSchema = _.clone(JobDefTemplate);
  Object.assign(jobDefTemplate, properties);
  return await jobDefService.createJobDef(_teamId, jobDefTemplate, "");
};

/**
 * Creates a taskdef schema with the given json formatted properties
 * @param _teamId
 * @param properties
 * @returns {Promise<JobDefSchema>}
 */
let CreateTaskDefFromTemplate = async (_teamId: mongodb.ObjectId, properties: any): Promise<TaskDefSchema> => {
  let taskDefTemplate: TaskDefSchema = _.clone(TaskDefTemplate);
  Object.assign(taskDefTemplate, properties);
  return await taskDefService.createTaskDef(_teamId, taskDefTemplate, "");
};

/**
 * Creates a stepdef schema with the given json formatted properties
 * @param _teamId
 * @param properties
 * @returns {Promise<JobDefSchema>}
 */
let CreateStepDefFromTemplate = async (_teamId: mongodb.ObjectId, properties: any): Promise<StepDefSchema> => {
  let stepDefTemplate: StepDefSchema = _.clone(StepDefTemplate);
  Object.assign(stepDefTemplate, properties);
  return await stepDefService.createStepDef(_teamId, stepDefTemplate, "");
};

/**
 * Creates job defs using the given json formatted properties
 * @param _teamId
 * @param properties
 * @returns { scripts: ScriptSchema[]; jobDefs: JobDefSchema[] }
 */
let CreateJobDefsFromTemplates = async (
  _teamId: mongodb.ObjectId,
  _userId: mongodb.ObjectId,
  properties: any
): Promise<{ scripts: ScriptSchema[]; jobDefs: JobDefSchema[] }> => {
  let scripts: ScriptSchema[] = [];
  for (let scriptProperties of properties.scripts) {
    const script = await CreateScriptFromTemplate(_teamId, _userId, scriptProperties);
    scripts[script.name] = convertResponseData(ScriptSchema, script);
  }

  let jobDefs: any = {};
  for (let jobDefProperties of properties.jobDefs) {
    const jobDef = convertResponseData(JobDefSchema, await CreateJobDefFromTemplate(_teamId, jobDefProperties));
    jobDef.taskDefs = {};

    for (let taskDefProperties of jobDefProperties.taskDefs) {
      taskDefProperties._jobDefId = jobDef.id;
      const taskDef = convertResponseData(TaskDefSchema, await CreateTaskDefFromTemplate(_teamId, taskDefProperties));
      taskDef.stepDefs = {};

      let order: number = 0;
      for (let stepDefProperties of taskDefProperties.stepDefs) {
        order++;
        stepDefProperties._taskDefId = taskDef.id;
        stepDefProperties._scriptId = scripts[stepDefProperties.scriptName].id;
        stepDefProperties.order = order;
        const stepDef = convertResponseData(StepDefSchema, await CreateStepDefFromTemplate(_teamId, stepDefProperties));
        taskDef.stepDefs[stepDef.name] = stepDef;
      }

      const awsLambdaStepDefs: StepDefSchema[] = _.filter(taskDef.stepDefs, (stepDef: StepDefSchema) => {
        return stepDef.name === "AwsLambda";
      });
      validateArrayLengthLessThanOrEqual(awsLambdaStepDefs, 1);

      jobDef.taskDefs[taskDef.name] = taskDef;
    }

    jobDefs[jobDef.name] = jobDef;
  }
  return { scripts, jobDefs };
};
export { CreateJobDefsFromTemplates };
/**
 *
 * @param job
 */
let CreateJob = async (_teamId: mongodb.ObjectId, job: Partial<JobSchema>, logger: BaseLogger, amqp: AMQPConnector) => {
  await jobService.createJob(_teamId, job, null, TaskSource.CONSOLE, logger, amqp);
};
export { CreateJob };

/**
 *
 * @param tasks
 */
let CreateTasks = async (_teamId: mongodb.ObjectId, tasks: Partial<TaskSchema>[]) => {
  for (let t of tasks) {
    await taskService.createTask(_teamId, t, null);
  }
};
export { CreateTasks };

let CreateTeamVariables = async (_teamId: mongodb.ObjectId, teamVars: Partial<TeamVariableSchema>[]) => {
  for (let t of teamVars) {
    await teamVariableService.createTeamVariable(_teamId, t, null);
  }
};
export { CreateTeamVariables };

/**
 *
 * @param agents
 */
let CreateAgents = async (_teamId: mongodb.ObjectId, agents: Partial<AgentSchema>[]) => {
  for (let a of agents) {
    await agentService.createAgent(_teamId, a, null);
  }
};
export { CreateAgents };
