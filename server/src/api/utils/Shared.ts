import * as config from "config";
import { SGStrings } from "../../shared/SGStrings";
import { BaseLogger } from "../../shared/SGLogger";

import { AgentSchema } from "../domain/Agent";
import { TaskSchema, TaskModel } from "../domain/Task";
import { agentService } from "../services/AgentService";
import { taskService } from "../services/TaskService";
import { teamVariableService } from "../services/TeamVariableService";
import { taskOutcomeService } from "../services/TaskOutcomeService";
import * as Enums from "../../shared/Enums";
import { AMQPConnector } from "../../shared/AMQPLib";
import { SGUtils } from "../../shared/SGUtils";
import * as mongodb from "mongodb";
import * as _ from "lodash";
import BitSet from "bitset";
import { int } from "aws-sdk/clients/datapipeline";
import { hasUncaughtExceptionCaptureCallback } from "process";
import { JobSchema } from "../domain/Job";
const jwt = require("jsonwebtoken");

const activeAgentTimeoutSeconds = config.get("activeAgentTimeoutSeconds");

/**
 * Returns true if the given task can be started which is generally true if it has no upstream dependencies and is not the target
 *  of an outbound route.
 * @param _teamId
 * @param task
 * @param logger
 */
let TaskReadyToPublish = async (_teamId: mongodb.ObjectId, task: TaskSchema, logger: BaseLogger): Promise<boolean> => {
  if (!_.isObject(task) || !("_jobId" in task) || !("up_dep" in task) || !("name" in task)) {
    const msg = "Invalid task object";
    logger.LogError(msg, { _teamId: _teamId, task: task });
    throw new Error(msg);
  }
  const tasks = await taskService.findAllJobTasks(_teamId, task._jobId, "toRoutes");
  const tasksToRoutes = SGUtils.flatMap(
    (x) => x,
    tasks.map((t) => SGUtils.flatMap((x) => x[0], t.toRoutes))
  );
  return (!task.up_dep || Object.keys(task.up_dep).length < 1) && tasksToRoutes.indexOf(task.name) < 0;
};

/**
 * Returns a filter to be used in a mongodb query to select active agents
 * @param requiredTags if not empty, will only return agents with all tags listed
 * @returns
 */
let ConstructActiveAgentsMongoFilter = async (requiredTags: any): Promise<any> => {
  let filter: any = {};
  filter.offline = false;
  filter.lastHeartbeatTime = {
    $gte: new Date().getTime() - parseInt(activeAgentTimeoutSeconds) * 1000,
  };
  filter["$and"] = [];
  for (let i = 0; i < Object.keys(requiredTags).length; i++) {
    const tagKey = Object.keys(requiredTags)[i];
    const tagFilterKey: string = `tags.${tagKey}`;
    let tagFilter: any = {};
    tagFilter[tagFilterKey] = requiredTags[tagKey];
    filter["$and"].push(tagFilter);
  }

  return filter;
};

/**
 * Returns a filter to be used in a mongodb query to select active agents for handling
 *  tasks targeting any or all active agents (general task handlers)
 */
let ConstructGeneralTaskHandlerAgentsMongoFilter = async (): Promise<any> => {
  return {
    $or: [
      { "propertyOverrides.handleGeneralTasks": { $exists: false } },
      { "propertyOverrides.handleGeneralTasks": true },
    ],
    offline: false,
    lastHeartbeatTime: {
      $gte: new Date().getTime() - parseInt(activeAgentTimeoutSeconds) * 1000,
    },
  };
};

/**
 * For tasks where the executing agent is specified, route using the agent id
 * @param _teamId
 * @param task
 * @param logger
 * @param agentQueueProperties
 * @returns
 */
let GetSingleSpecificAgentTaskRoute = async (
  _teamId: mongodb.ObjectId,
  task: TaskSchema,
  logger: BaseLogger,
  agentQueueProperties: any
): Promise<object[] | null> => {
  if (!task.targetAgentId) {
    const errMsg = `Task target is "SINGLE_SPECIFIC_AGENT" but targetAgentId is missing`;
    logger.LogError(errMsg, {
      Class: "Shared",
      Method: "GetTaskRoutes",
      _teamId,
      _jobId: task._jobId,
      task: task,
    });
    return null;
  }

  const targetAgentQuery = await agentService.findAllAgents(
    _teamId,
    {
      _id: task.targetAgentId,
      offline: false,
      lastHeartbeatTime: {
        $gte: new Date().getTime() - parseInt(activeAgentTimeoutSeconds) * 1000,
      },
    },
    "lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds"
  );
  if (!targetAgentQuery || (_.isArray(targetAgentQuery) && targetAgentQuery.length === 0)) {
    const errMsg = `Target agent not available`;
    logger.LogDebug(errMsg, {
      Class: "Shared",
      Method: "GetTaskRoutes",
      _teamId,
      _jobId: task._jobId,
      task: task,
    });
    return null;
  }

  return [
    {
      route: SGStrings.GetAgentQueue(_teamId.toHexString(), task.targetAgentId),
      type: "queue",
      queueAssertArgs: agentQueueProperties,
      targetAgentId: task.targetAgentId,
    },
  ];
};

/**
 * Sort function for selecting one of multiple target agents
 * @param a
 * @param b
 * @returns
 */
let ActiveAgentSortFunction = (a, b) => {
  const a_unusedCapacity = a.propertyOverrides.maxActiveTasks - a.numActiveTasks;
  const b_unusedCapacity = b.propertyOverrides.maxActiveTasks - b.numActiveTasks;
  const a_lastTaskAssignedTime = a.lastTaskAssignedTime ? a.lastTaskAssignedTime : 0;
  const b_lastTaskAssignedTime = b.lastTaskAssignedTime ? b.lastTaskAssignedTime : 0;
  return b_unusedCapacity > a_unusedCapacity
    ? 1
    : a_unusedCapacity > b_unusedCapacity
    ? -1
    : a_lastTaskAssignedTime > b_lastTaskAssignedTime
    ? 1
    : b_lastTaskAssignedTime > a_lastTaskAssignedTime
    ? -1
    : 0;
};

/**
 * Sort function for selecting one of multiple target lambda runner agents
 * @param a
 * @param b
 * @returns
 */
let ActiveLambdaRunnerAgentSortFunction = (a, b) => {
  const a_unusedCapacity = a.propertyOverrides.maxActiveTasks - a.numActiveTasks;
  const b_unusedCapacity = b.propertyOverrides.maxActiveTasks - b.numActiveTasks;
  return b_unusedCapacity > a_unusedCapacity
    ? 1
    : a_unusedCapacity > b_unusedCapacity
    ? -1
    : b.lastHeartbeatTime > a.lastHeartbeatTime
    ? 1
    : a.lastHeartbeatTime > b.lastHeartbeatTime
    ? -1
    : 0;
};

/**
 * For tasks requiring a single agent with designated tags, get a list of all active agents with all required tags.
 *  If no agents exist with all required tags, log an error and return.
 * @param _teamId
 * @param task
 * @param logger
 * @param agentQueueProperties
 * @returns
 */
let GetSingleAgentWithTagsTaskRoute = async (
  _teamId: mongodb.ObjectId,
  task: TaskSchema,
  logger: BaseLogger,
  agentQueueProperties: any,
  agentsWithRequiredTags: AgentSchema[],
  AgentSortFunction: any
): Promise<object[] | null> => {
  // console.log(`GetTaskRoutes -> before filter -> ${JSON.stringify(agentsWithRequiredTags, null, 4)}`);
  const agentCandidates = _.filter(agentsWithRequiredTags, (a) => task.attemptedRunAgentIds.indexOf(a._id) < 0);
  // console.log(`GetTaskRoutes -> after filter -> ${JSON.stringify(agentCandidates, null, 4)}`);
  if (agentCandidates.length < 1) {
    const errMsg = `No agents with required tags available to complete this task`;
    logger.LogError(errMsg, {
      Class: "Shared",
      Method: "GetTaskRoutes",
      _teamId,
      _jobId: task._jobId,
      task: task,
    });
    return null;
  }

  agentCandidates.sort(AgentSortFunction);
  // console.log(`GetTaskRoutes -> after sort -> ${JSON.stringify(agentCandidates, null, 4)}`);
  const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agentCandidates[0]._id);
  return [
    {
      route: agentQueue,
      type: "queue",
      queueAssertArgs: agentQueueProperties,
      targetAgentId: agentCandidates[0]._id,
    },
  ];
};

let GetTaskRoutes = async (_teamId: mongodb.ObjectId, task: TaskSchema, logger: BaseLogger) => {
  let routes: any[] = [];
  let updatedTask = undefined;

  const agentQueueProperties: any = {
    exclusive: false,
    durable: true,
    autoDelete: false,
  };
  const inactiveAgentQueueTTLHours = parseInt(config.get("inactiveAgentQueueTTLHours"), 10);
  let inactiveAgentQueueTTL = inactiveAgentQueueTTLHours * 60 * 60 * 1000;
  if (inactiveAgentQueueTTL > 0) agentQueueProperties["expires"] = inactiveAgentQueueTTL;

  /// Tasks targeting one specific agent
  if (task.target == Enums.TaskDefTarget.SINGLE_SPECIFIC_AGENT) {
    routes = await GetSingleSpecificAgentTaskRoute(_teamId, task, logger, agentQueueProperties);
    if (!routes)
      return {
        routes: null,
        error: "Target agent not available",
        failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
      };
    else routes.push(routes);
    const targetAgentId = new mongodb.ObjectId(task.targetAgentId);
    await agentService.updateAgentLastTaskAssignedTime(_teamId, targetAgentId, Date.now(), null, "_id");
  }
  /// For tasks requiring agents with designated tags, get a list of all active agents with all required tags.
  ///   If no agents exist with all required tags, log an error and return.
  else if (task.target & (Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)) {
    if (_.isPlainObject(task.requiredTags) && Object.keys(task.requiredTags).length > 0) {
      const filter = await ConstructActiveAgentsMongoFilter(task.requiredTags);
      const agentsWithRequiredTags: AgentSchema[] = await agentService.findAllAgents(
        _teamId,
        filter,
        "lastHeartbeatTime propertyOverrides numActiveTasks attemptedRunAgentIds lastTaskAssignedTime"
      );

      if (agentsWithRequiredTags.length < 1) {
        const errMsg = `No agent with required tags available`;
        logger.LogDebug(errMsg, {
          Class: "Shared",
          Method: "GetTaskRoutes",
          _teamId,
          _jobId: task._jobId,
          task: task,
        });
        return {
          routes: null,
          error: errMsg,
          failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
        };
      }

      if (task.target == Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS) {
        /// Publish the task in the queue of each qualified agent
        for (let i = 0; i < agentsWithRequiredTags.length; i++) {
          const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agentsWithRequiredTags[i]._id);
          routes.push({
            route: agentQueue,
            type: "queue",
            queueAssertArgs: agentQueueProperties,
            targetAgentId: agentsWithRequiredTags[i]._id,
          });
          await agentService.updateAgentLastTaskAssignedTime(
            _teamId,
            agentsWithRequiredTags[i]._id,
            Date.now(),
            null,
            "_id"
          );
        }
      } else {
        /// Pick the agent that is currently the least utilized and send the task to it.
        const routes: any[] = await GetSingleAgentWithTagsTaskRoute(
          _teamId,
          task,
          logger,
          agentQueueProperties,
          agentsWithRequiredTags,
          ActiveAgentSortFunction
        );

        if (!routes) {
          return {
            routes: null,
            error: "No agent with required tags available",
            failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
          };
        } else {
          if (routes[0].targetAgentId) {
            const targetAgentId = routes[0].targetAgentId;
            updatedTask = await TaskModel.findOneAndUpdate(
              { _id: task._id, _teamId },
              { $push: { attemptedRunAgentIds: targetAgentId } },
              { new: true }
            );
            await agentService.updateAgentLastTaskAssignedTime(_teamId, targetAgentId, Date.now(), null, "_id");
          }
        }
      }
    } else {
      let errMsg = "";
      if (_.isPlainObject(task.requiredTags))
        errMsg = `Task target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but no required tags are specified`;
      else
        errMsg = `Task target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but required tags are incorrectly formatted`;
      logger.LogError(errMsg, {
        Class: "Shared",
        Method: "GetTaskRoutes",
        _teamId,
        _jobId: task._jobId,
        task: task,
      });
      return {
        routes: null,
        error: errMsg,
        failureCode: Enums.TaskFailureCode.MISSING_TARGET_TAGS,
      };
    }
  }
  /// For aws lambda objectives, route the task to a SaaSGlue aws lambda agent
  else if (task.target == Enums.TaskDefTarget.AWS_LAMBDA) {
    const sgAdminTeam = new mongodb.ObjectId(config.get("sgAdminTeam"));
    const requiredTags = config.get("awsLambdaRequiredTags");

    const filter = await ConstructActiveAgentsMongoFilter(requiredTags);
    const agentsWithRequiredTags = await agentService.findAllAgents(
      sgAdminTeam,
      filter,
      "lastHeartbeatTime propertyOverrides numActiveTasks attemptedRunAgentIds"
    );

    if (agentsWithRequiredTags.length < 1) {
      const errMsg = `No lambda runner agents available`;
      logger.LogError(errMsg, {
        Class: "Shared",
        Method: "GetTaskRoutes",
        _teamId,
        _jobId: task._jobId,
        task: task,
      });
      return {
        routes: null,
        error: errMsg,
        failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
      };
    }

    const routes: any[] = await GetSingleAgentWithTagsTaskRoute(
      _teamId,
      task,
      logger,
      agentQueueProperties,
      agentsWithRequiredTags,
      ActiveLambdaRunnerAgentSortFunction
    );

    if (!routes) {
      return {
        routes: null,
        error: "No agent with required tags available",
        failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
      };
    } else {
      if (routes[0].targetAgentId) {
        const targetAgentId = routes[0].targetAgentId;
        updatedTask = await TaskModel.findOneAndUpdate(
          { _id: task._id, _teamId },
          { $push: { attemptedRunAgentIds: targetAgentId } },
          { new: true }
        );
      }
    }
  }
  /// For objecives not requiring particular tags, route the task to a single agent or all agents
  else {
    const filter: any = ConstructGeneralTaskHandlerAgentsMongoFilter();
    const agentsQuery = await agentService.findAllAgents(
      _teamId,
      filter,
      "lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds"
    );
    if (!agentsQuery || (_.isArray(agentsQuery) && agentsQuery.length === 0)) {
      const errMsg = `No agent available`;
      logger.LogError(errMsg, {
        Class: "Shared",
        Method: "GetTaskRoutes",
        _teamId,
        _jobId: task._jobId,
        task: task,
      });
      return {
        routes: null,
        error: errMsg,
        failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
      };
    }

    if (task.target & Enums.TaskDefTarget.ALL_AGENTS) {
      for (let i = 0; i < Object.keys(agentsQuery).length; i++) {
        const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agentsQuery[i]._id);
        routes.push({
          route: agentQueue,
          type: "queue",
          queueAssertArgs: agentQueueProperties,
          targetAgentId: agentsQuery[i]._id,
        });
        await agentService.updateAgentLastTaskAssignedTime(_teamId, agentsQuery[i]._id, Date.now(), null, "_id");
      }
    } else {
      /// Pick the agent that is currently the least utilized and send the task to it.
      const routes: any[] = await GetSingleAgentWithTagsTaskRoute(
        _teamId,
        task,
        logger,
        agentQueueProperties,
        agentsQuery,
        ActiveAgentSortFunction
      );

      if (!routes) {
        return {
          routes: null,
          error: "No agent available to complete this task",
          failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
        };
      } else {
        if (routes[0].targetAgentId) {
          const targetAgentId = routes[0].targetAgentId;
          updatedTask = await TaskModel.findOneAndUpdate(
            { _id: task._id, _teamId },
            { $push: { attemptedRunAgentIds: targetAgentId } },
            { new: true }
          );
          await agentService.updateAgentLastTaskAssignedTime(_teamId, targetAgentId, Date.now(), null, "_id");
        }
      }
    }
  }

  return { routes: routes, task: updatedTask };
};

/**
 * Gets the target agent id. Defaults to the targetAgentId property of the task.
 *  If the task targetAgentId is of the form @sgg("[target agent id name]") then
 *    an attempt will be made to retrieve the actual agent id from a runtime variable
 *    starting with task, the job, then team runtime variables returning the first one
 *    found. If no matching runtime variables are found, the targetAgentId string will
 *    be returned.
 * @param _teamId
 * @param task
 * @param job
 * @param logger
 * @returns
 */
let GetTargetAgentId = async (
  _teamId: mongodb.ObjectId,
  task: TaskSchema,
  job: Partial<JobSchema>,
  logger: BaseLogger
): Promise<mongodb.ObjectId> => {
  let targetAgentId: string = task.targetAgentId;

  let runtimeVarsTask: any = {};
  if (task.runtimeVars) runtimeVarsTask = Object.assign(runtimeVarsTask, task.runtimeVars);

  let arrFound: string[] = task.targetAgentId.match(/@sgg?(\([^)]*\))/gi);
  if (arrFound) {
    // replace runtime variable in target agent id
    try {
      let varKey = arrFound[0].substr(5, arrFound[0].length - 6);
      if (varKey.substr(0, 1) === '"' && varKey.substr(varKey.length - 1, 1) === '"') varKey = varKey.slice(1, -1);
      if (runtimeVarsTask[varKey]) {
        targetAgentId = runtimeVarsTask[varKey]["value"];
      } else if (job.runtimeVars[varKey]) {
        targetAgentId = job.runtimeVars[varKey]["value"];
      } else {
        const teamVar = await teamVariableService.findTeamVariableByName(_teamId, varKey, "value");
        if (_.isArray(teamVar) && teamVar.length > 0) targetAgentId = teamVar[0].value;
      }
    } catch (e) {
      logger.LogError("Error in arguments @sgg capture for targetAgentId string", {
        Class: "TaskOutcomeService",
        Method: "PublishTask",
        _teamId,
        task,
        Error: e,
      });
    }
  }

  return targetAgentId;
};

/**
 * Republish tasks waiting for an agent
 * @param _agentId optional - if included only this agent will be attempted again,
 *                              otherwise all agents will be attempted again
 * @param logger
 * @param amqp
 */
let RepublishTask = async (
  _agentId: mongodb.ObjectId,
  logger: BaseLogger,
  amqp: AMQPConnector,
  noAgentTask: TaskSchema
) => {
  const teamIdTask = noAgentTask._teamId;
  let updatedTask: any;
  if (_agentId)
    updatedTask = await taskService.updateTask(
      teamIdTask,
      noAgentTask._id,
      { $pull: { attemptedRunAgentIds: _agentId } },
      logger
    );
  else updatedTask = await taskService.updateTask(teamIdTask, noAgentTask._id, { attemptedRunAgentIds: [] }, logger);

  if (await TaskReadyToPublish(teamIdTask, updatedTask, logger)) {
    if (updatedTask.status == Enums.TaskStatus.WAITING_FOR_AGENT) {
      updatedTask = await taskService.updateTask(
        teamIdTask,
        updatedTask._id,
        { status: Enums.TaskStatus.NOT_STARTED },
        logger,
        { status: Enums.TaskStatus.WAITING_FOR_AGENT },
        null,
        null
      );
      await taskOutcomeService.PublishTask(teamIdTask, updatedTask, logger, amqp);
    }
  }
};

/**
 * Gets an array of all tasks waiting for an agent for the given team.
 * @param _teamId
 * @returns {TaskSchema[]}
 */
let GetWaitingForAgentTasks = async (_teamId: mongodb.ObjectId): Promise<TaskSchema[]> => {
  let noAgentTasksFilter = {};
  noAgentTasksFilter["_teamId"] = _teamId;
  noAgentTasksFilter["status"] = { $eq: Enums.TaskStatus.WAITING_FOR_AGENT };
  noAgentTasksFilter["target"] = { $ne: Enums.TaskDefTarget.AWS_LAMBDA };
  // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
  return await taskService.findAllTasksInternal(noAgentTasksFilter, "_id _teamId");
};

let RepublishTasksWaitingForAgent = async (
  _teamId: mongodb.ObjectId,
  _agentId: mongodb.ObjectId,
  logger: BaseLogger,
  amqp: AMQPConnector
) => {
  const noAgentTasks: TaskSchema[] = await GetWaitingForAgentTasks(_teamId);
  if (_.isArray(noAgentTasks) && noAgentTasks.length > 0) {
    for (let i = 0; i < noAgentTasks.length; i++) {
      await RepublishTask(_agentId, logger, amqp, noAgentTasks[i]);
    }
  }
};

/**
 * Gets an array of all tasks waiting for a lambda agent.
 * @returns {TaskSchema[]}
 */
let GetWaitingForLambdaRunnerTasks = async (): Promise<TaskSchema[]> => {
  let noAgentTasksFilter = {};
  noAgentTasksFilter["status"] = { $eq: Enums.TaskStatus.WAITING_FOR_AGENT };
  noAgentTasksFilter["target"] = { $eq: Enums.TaskDefTarget.AWS_LAMBDA };
  // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
  return await taskService.findAllTasksInternal(noAgentTasksFilter, "_id _teamId", 10);
};

/**
 * Republish tasks waiting for a lambda runner agent
 * @param _agentId optional - if included only this agent will be attempted again,
 *                              otherwise all agents will be attempted again
 * @param logger
 * @param amqp
 */
let RepublishTasksWaitingForLambdaRunner = async (
  _agentId: mongodb.ObjectId,
  logger: BaseLogger,
  amqp: AMQPConnector
) => {
  const noAgentTasks: TaskSchema[] = await GetWaitingForLambdaRunnerTasks();
  if (_.isArray(noAgentTasks) && noAgentTasks.length > 0) {
    for (let i = 0; i < noAgentTasks.length; i++) {
      await RepublishTask(_agentId, logger, amqp, noAgentTasks[i]);
    }
  }
};

/**
 * Returns the number of tasks for the given team that have not been started
 * @param _teamId
 * @returns int
 */
let NumNotStartedTasks = async (_teamId: mongodb.ObjectId): Promise<int> => {
  let numNotStartedTasks: int = 0;
  let noAgentTasksFilter = {};
  noAgentTasksFilter["_teamId"] = _teamId;
  noAgentTasksFilter["status"] = {
    $in: [Enums.TaskStatus.WAITING_FOR_AGENT, Enums.TaskStatus.NOT_STARTED],
  };
  // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
  const noAgentTasks = await taskService.findAllTasksInternal(noAgentTasksFilter);
  if (_.isArray(noAgentTasks)) numNotStartedTasks = noAgentTasks.length;

  return numNotStartedTasks;
};

let GetAccessRightIdsForTeamUser = () => {
  return [3, 7, 8, 12, 16, 17, 18, 19, 21, 22, 27, 28, 29, 30, 41, 42, 43, 44, 45, 48, 49, 50, 51, 52, 53];
};

let GetAccessRightIdsForTeamAdmin = () => {
  return [
    3, 4, 7, 8, 12, 16, 17, 18, 19, 21, 22, 27, 28, 29, 30, 31, 32, 33, 36, 37, 38, 40, 41, 42, 43, 44, 45, 48, 49, 50,
    51, 52, 53, 56,
  ];
};

let GetAccessRightIdsForSGAdmin = () => {
  return [1, 2, 5, 10, 13, 14, 23, 24, 34, 35, 39, 46, 47, 54, 55];
};

let GetAccessRightIdsForSGAgent = () => {
  return [6, 8, 9, 11, 12, 15, 22, 25, 26, 48];
};

let GetGlobalAccessRightId = () => {
  return 57;
};

let convertTeamAccessRightsToBitset = (accessRightIds: number[]) => {
  const bitset = new BitSet();
  for (let accessRightId of accessRightIds) {
    bitset.set(accessRightId, 1);
  }
  return bitset.toString(16); // more efficient as hex
};

export { GetTargetAgentId };
export { convertTeamAccessRightsToBitset };
export { GetTaskRoutes };
export { RepublishTasksWaitingForAgent };
export { GetWaitingForLambdaRunnerTasks };
export { GetWaitingForAgentTasks };
export { RepublishTasksWaitingForLambdaRunner };
export { GetAccessRightIdsForTeamUser };
export { GetAccessRightIdsForTeamAdmin };
export { GetAccessRightIdsForSGAdmin };
export { GetAccessRightIdsForSGAgent };
export { GetGlobalAccessRightId };
export { NumNotStartedTasks };
export { TaskReadyToPublish };
