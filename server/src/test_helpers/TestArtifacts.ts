import axios from "axios";
import {readFile} from "fs";

import * as _ from "lodash";
import * as moment from "moment";
import * as mongodb from "mongodb";

import {AgentSchema} from "../api/domain/Agent";
import {ArtifactSchema} from "../api/domain/Artifact";
import {JobSchema} from "../api/domain/Job";
import {JobDefSchema} from "../api/domain/JobDef";
import {SaascipeSchema} from "../api/domain/Saascipe";
import {SaascipeVersionSchema} from "../api/domain/SaascipeVersion";
import {ScriptSchema} from "../api/domain/Script";
import {SettingsSchema} from "../api/domain/Settings";
import {StepDefSchema} from "../api/domain/StepDef";
import {TaskSchema} from "../api/domain/Task";
import {TaskDefSchema} from "../api/domain/TaskDef";
import {TeamSchema} from "../api/domain/Team";
import {TeamVariableSchema} from "../api/domain/TeamVariable";

import {agentService} from "../api/services/AgentService";
import {artifactService} from "../api/services/ArtifactService";
import {jobService} from "../api/services/JobService";
import {jobDefService} from "../api/services/JobDefService";
import {saascipeService} from "../api/services/SaascipeService";
import {saascipeVersionService} from "../api/services/SaascipeVersionService";
import {scriptService} from "../api/services/ScriptService";
import {settingsService} from "../api/services/SettingsService";
import {stepDefService} from "../api/services/StepDefService";
import {taskService} from "../api/services/TaskService";
import {taskDefService} from "../api/services/TaskDefService";
import {teamService} from "../api/services/TeamService";
import {teamVariableService} from "../api/services/TeamVariableService";

import {convertData as convertResponseData} from "../api/utils/ResponseConverters";

import {AMQPConnector} from "../shared/AMQPLib";
import {SGUtils} from "../shared/SGUtils";

import {validateArrayLengthLessThanOrEqual} from "./Validators";

import * as config from "config";
import {TaskSource} from "../shared/Enums";
import {BaseLogger} from "../shared/SGLogger";

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
export {LongRunningJob};

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
export {InteractiveConsoleJob};

let SettingsTemplate: any[] = [
  {
    Type: "Billing",
    Values: {
      defaultScriptPricing: {
        tiers: [
          {
            count: null,
            rate: 0.01,
          },
        ],
      },
      defaultJobStoragePerMBRate: 0.015,
      defaultNewAgentRate: 0.00176,
      defaultArtifactsDownloadedPerGBRate: 0.09,
      defaultArtifactsStoragePerGBRate: 0.023,
      defaultAwsLambdaComputeGbSecondsRate: 0.0000166667,
      defaultAwsLambdaRequestsRate: 2.0000000000000002e-7,
      invoiceDueGracePeriodDays: 14,
    },
  },
  {
    Type: "FreeTierLimits",
    Values: {
      maxScriptsPerBillingCycle: 500,
      maxAgents: 10,
      freeDaysJobStorage: 60,
      freeArtifactsDownloadBytes: 0,
      freeArtifactsStorageBytes: 0,
    },
    __v: 0,
  },
];

let TeamTemplate: any = {
  name: "Test Team",
};
export {TeamTemplate};

let ScriptTemplate: any = {
  name: "Script 1",
  scriptType: "2",
  code: "ZWNobyAiSGVsbG8gV29ybGQi",
  shadowCopyCode: "ZWNobyAiSGVsbG8gV29ybGQi",
};
export {ScriptTemplate};

let JobDefTemplate: any = {
  Name: "Job 1",
  createdBy: mongodb.ObjectId(),
  runtimeVars: {},
};
export {JobDefTemplate};

let TaskDefTemplate: any = {
  name: "Task 1",
  requiredTags: [],
  dependsOn: [],
  target: 1,
};
export {TaskDefTemplate};

let StepDefTemplate: any = {
  name: "Step 1",
  order: "0",
  arguments: "",
  variables: "",
};
export {StepDefTemplate};

/**
 * Creates a settings schema based on the template
 * @returns {Promise<SettingsSchema>}
 */
let CreateSettingsFromTemplate = async (): Promise<SettingsSchema[]> => {
  let settingsTemplate: SettingsSchema[] = _.clone(SettingsTemplate);
  let settings: SettingsSchema[] = [];
  for (let template of settingsTemplate) {
    settings.push(convertResponseData(SettingsSchema, await settingsService.createSettings(template)));
  }
  return settings;
};
export {CreateSettingsFromTemplate};

/**
 * Creates a team schema from the template with the given json formatted properties
 * @param _userId
 * @param properties
 * @returns {Promise<SettingsSchema>}
 */
let CreateTeamFromTemplate = async (
  _userId: mongodb.ObjectId,
  properties: any,
  logger: BaseLogger
): Promise<TeamSchema> => {
  let teamTemplate: TeamSchema = _.clone(TeamTemplate);
  teamTemplate.ownerId = _userId;
  teamTemplate.userAssigned = true;
  Object.assign(teamTemplate, properties);
  const team: TeamSchema = await teamService.createTeam(teamTemplate, logger);
  return convertResponseData(TeamSchema, team);
};
export {CreateTeamFromTemplate};

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
  const script: ScriptSchema = await scriptService.createScript(_teamId, scriptTemplate, _userId, "");
  return convertResponseData(ScriptSchema, script);
};
export {CreateScriptFromTemplate};

/**
 * Creates an artifact schema with the given json formatted data
 * @param _teamId
 * @param data
 * @param artifactPath
 * @returns {Promise<ArtifactSchema>}
 */
let CreateArtifact = async (
  _teamId: mongodb.ObjectId,
  data: Partial<ArtifactSchema>,
  artifactPath: string
): Promise<ArtifactSchema> => {
  const artifact: ArtifactSchema = await artifactService.createArtifact(_teamId, data, "");

  const readFileAsync = require("util").promisify(readFile);
  const fileData = await readFileAsync(artifactPath);

  var options = {
    headers: {
      "Content-Type": artifact.type,
    },
  };

  await axios.put(artifact.url, fileData, options);

  return convertResponseData(ArtifactSchema, artifact);
};
export {CreateArtifact};

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
): Promise<{scripts: Array<ScriptSchema>; jobDefs: Map<string, JobDefSchema>}> => {
  let scripts: Array<ScriptSchema> = [];
  for (let scriptProperties of properties.scripts) {
    const script = await CreateScriptFromTemplate(_teamId, _userId, scriptProperties);
    scripts[script.name] = script;
  }

  let jobDefs: Map<string, JobDefSchema> = new Map([]);
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

      jobDefs[jobDef.name] = jobDef;
    }
  }
  return {scripts, jobDefs};
};
export {CreateJobDefsFromTemplates};
/**
 *
 * @param job
 */
let CreateJob = async (_teamId: mongodb.ObjectId, job: Partial<JobSchema>, logger: BaseLogger, amqp: AMQPConnector) => {
  await jobService.createJob(_teamId, job, null, TaskSource.CONSOLE, logger, amqp);
};
export {CreateJob};

/**
 *
 * @param tasks
 */
let CreateTasks = async (_teamId: mongodb.ObjectId, tasks: Partial<TaskSchema>[]) => {
  for (let t of tasks) {
    await taskService.createTask(_teamId, t, null);
  }
};
export {CreateTasks};

let CreateTeamVariables = async (_teamId: mongodb.ObjectId, teamVars: Partial<TeamVariableSchema>[]) => {
  for (let t of teamVars) {
    await teamVariableService.createTeamVariable(_teamId, t, null);
  }
};
export {CreateTeamVariables};

/**
 *
 * @param agents
 */
let CreateAgents = async (_teamId: mongodb.ObjectId, agents: Partial<AgentSchema>[]) => {
  for (let a of agents) {
    await agentService.createAgent(_teamId, a, null);
  }
};
export {CreateAgents};

/**
 *
 * @param saascipes
 */
let CreateSaascipes = async (
  _teamId: mongodb.ObjectId,
  saascipes: Partial<SaascipeSchema>[]
): Promise<{[key: string]: SaascipeSchema}> => {
  const results: {[key: string]: SaascipeSchema} = {};
  for (let s of saascipes) {
    const saascipe: SaascipeSchema = await saascipeService.createSaascipe(_teamId, s, null);
    results[saascipe._id.toHexString()] = convertResponseData(SaascipeSchema, saascipe);
  }
  return results;
};
export {CreateSaascipes};

/**
 *
 * @param saascipeversions
 */
let CreateSaascipeVersions = async (
  _teamId: mongodb.ObjectId,
  saascipeversions: Partial<SaascipeVersionSchema>[]
): Promise<{[key: string]: SaascipeVersionSchema}> => {
  const results: {[key: string]: SaascipeVersionSchema} = {};
  for (let s of saascipeversions) {
    const saascipeVersion: SaascipeVersionSchema = await saascipeVersionService.createSaascipeVersion(_teamId, s, null);
    results[saascipeVersion._id.toHexString()] = saascipeVersion;
  }
  return results;
};
export {CreateSaascipeVersions};
