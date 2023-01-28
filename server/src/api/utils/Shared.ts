import { int } from 'aws-sdk/clients/datapipeline';

import BitSet from 'bitset';
import * as config from 'config';
const jwt = require('jsonwebtoken');
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { hasUncaughtExceptionCaptureCallback } from 'process';

import { AgentSchema } from '../domain/Agent';
import { JobSchema } from '../domain/Job';
import { TaskSchema, TaskModel } from '../domain/Task';

import { agentService } from '../services/AgentService';
import { taskService } from '../services/TaskService';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { teamVariableService } from '../services/TeamVariableService';

import { AMQPConnector } from '../../shared/AMQPLib';
import * as Enums from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';
import { SGStrings } from '../../shared/SGStrings';
import { SGUtils } from '../../shared/SGUtils';

import { LaunchTaskError, ValidationError } from '../utils/Errors';

const __ACTIVE_AGENT_TIMEOUT_SECONDS = config.get('activeAgentTimeoutSeconds');

interface IPublishTaskRoute {
    route: string;
    type: string;
    queueAssertArgs: any;
    targetAgentId: string;
}

interface IGetTaskRouteResult {
    routes: IPublishTaskRoute[] | null;
    task?: TaskSchema;
    error?: string;
    failureCode?: Enums.TaskFailureCode;
}

/**
 * Returns true if the given task can be started which is generally true if it has no upstream dependencies and is not the target
 *  of an outbound route.
 * @param _teamId
 * @param task
 * @param logger
 */
let TaskReadyToPublish = async (_teamId: mongodb.ObjectId, task: TaskSchema, logger: BaseLogger): Promise<boolean> => {
    if (!_.isObject(task) || !('_jobId' in task) || !('up_dep' in task) || !('name' in task)) {
        const msg = 'Invalid task object';
        logger.LogError(msg, { _teamId: _teamId, task: task });
        throw new Error(msg);
    }
    const tasks = await taskService.findAllJobTasks(_teamId, task._jobId, 'toRoutes');
    const tasksToRoutes = SGUtils.flatMap(
        (x) => x,
        tasks.map((t) => SGUtils.flatMap((x) => x[0], t.toRoutes))
    );
    return (!task.up_dep || Object.keys(task.up_dep).length < 1) && tasksToRoutes.indexOf(task.name) < 0;
};

/**
 * Returns a filter to be used in a mongodb query to select active agents for handling
 *  tasks targeting any or all active agents (general task handlers)
 */
let ConstructGeneralTaskHandlerAgentsMongoFilter = async (): Promise<any> => {
    return {
        $or: [
            { 'propertyOverrides.handleGeneralTasks': { $exists: false } },
            { 'propertyOverrides.handleGeneralTasks': true },
        ],
        offline: false,
        lastHeartbeatTime: {
            $gte: new Date().getTime() - parseInt(__ACTIVE_AGENT_TIMEOUT_SECONDS) * 1000,
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
            Class: 'Shared',
            Method: 'GetTaskRoutes',
            _teamId,
            _jobId: task._jobId,
            task: task,
        });
        return null;
    }

    const filter: any = {
        _id: task.targetAgentId,
        offline: false,
        lastHeartbeatTime: {
            $gte: new Date().getTime() - parseInt(__ACTIVE_AGENT_TIMEOUT_SECONDS) * 1000,
        },
    };
    const targetAgentQuery = await agentService.findAllAgents(_teamId, filter, '_id');
    if (!targetAgentQuery || (_.isArray(targetAgentQuery) && targetAgentQuery.length === 0)) {
        const errMsg = `Target agent not available`;
        logger.LogDebug(errMsg, {
            Class: 'Shared',
            Method: 'GetTaskRoutes',
            _teamId,
            _jobId: task._jobId,
            task: task,
        });
        return null;
    }

    return [
        {
            route: SGStrings.GetAgentQueue(_teamId.toHexString(), task.targetAgentId),
            type: 'queue',
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
 * For tasks targeting a single agent, get the least utilized agent from a given list
 * @param _teamId
 * @param task
 * @param logger
 * @param agentQueueProperties
 * @params candidateAgents
 * @params AgentSortFunction
 * @returns
 */
let GetSingleAgentTaskRoute = async (
    _teamId: mongodb.ObjectId,
    task: TaskSchema,
    logger: BaseLogger,
    agentQueueProperties: any,
    candidateAgents: Array<Partial<AgentSchema>>,
    AgentSortFunction: any
): Promise<object[] | null> => {
    const filteredAgentCandidates = _.filter(
        candidateAgents,
        (a) => task.attemptedRunAgentIds.indexOf(a._id.toHexString()) < 0
    );
    if (filteredAgentCandidates.length < 1) {
        throw new LaunchTaskError(
            'No qualified agent available to complete this task',
            Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
            task
        );
    }

    filteredAgentCandidates.sort(AgentSortFunction);
    // console.log(`GetTaskRoutes -> after sort -> ${JSON.stringify(agentCandidates, null, 4)}`);
    const targetAgentIdAsString = filteredAgentCandidates[0]._id.toHexString();
    const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), targetAgentIdAsString);
    return [
        {
            route: agentQueue,
            type: 'queue',
            queueAssertArgs: agentQueueProperties,
            targetAgentId: targetAgentIdAsString,
        },
    ];
};

/**
 * Pick the agent that is currently the least utilized
 * @param _teamId
 * @param agentCandidates
 * @param agentQueueProperties
 */
let CreateTaskRouteForSingleAgent = async (
    _teamId: mongodb.ObjectId,
    agentCandidates: Partial<AgentSchema>[],
    task: TaskSchema,
    agentSortFunction: any,
    agentQueueProperties: any,
    logger: BaseLogger
): Promise<[any[], TaskSchema | undefined]> => {
    let updatedTask: TaskSchema = undefined;
    let routes: any[] = await GetSingleAgentTaskRoute(
        _teamId,
        task,
        logger,
        agentQueueProperties,
        agentCandidates,
        agentSortFunction
    );

    if (!routes || (_.isArray(routes) && routes.length < 1)) {
        throw new LaunchTaskError(
            'No agent with required tags available',
            Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
            task
        );
    } else {
        if (!routes[0].hasOwnProperty('targetAgentId'))
            throw new LaunchTaskError(
                'Route missing targetAgentId',
                Enums.TaskFailureCode.TARGET_AGENT_NOT_SPECIFIED,
                task
            );
        const targetAgentId = routes[0].targetAgentId;
        updatedTask = await TaskModel.findOneAndUpdate(
            { _id: task._id, _teamId: task._teamId },
            { $addToSet: { attemptedRunAgentIds: targetAgentId } },
            { new: true }
        );
        await agentService.updateAgentLastTaskAssignedTime(_teamId, targetAgentId, Date.now(), null, '_id');
    }

    return [routes, updatedTask];
};

/**
 * Publish the task in the queue of each qualified agent
 * @param _teamId
 * @param agents
 * @param logger
 * @param agentQueueProperties
 */
let CreateTaskRoutesForAgents = async (
    _teamId: mongodb.ObjectId,
    agents: Partial<AgentSchema>[],
    agentQueueProperties: any
): Promise<IPublishTaskRoute[]> => {
    let routes: any[] = [];
    for (let i = 0; i < agents.length; i++) {
        const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agents[i]._id);
        routes.push({
            route: agentQueue,
            type: 'queue',
            queueAssertArgs: agentQueueProperties,
            targetAgentId: agents[i]._id.toHexString(),
        });
        await agentService.updateAgentLastTaskAssignedTime(_teamId, agents[i]._id, Date.now(), null, '_id');
    }

    return routes;
};

/**
 * Gets routes for delivering tasks to agents
 * @param _teamId
 * @param task
 * @param logger
 * @returns
 */
let GetTaskRoutes = async (
    _teamId: mongodb.ObjectId,
    task: TaskSchema,
    logger: BaseLogger
): Promise<IGetTaskRouteResult> => {
    let routes: any[] = [];
    let updatedTask: TaskSchema = undefined;

    const agentQueueProperties: any = {
        exclusive: false,
        durable: true,
        autoDelete: false,
    };
    try {
        if (task.status > Enums.TaskStatus.PUBLISHED)
            throw new LaunchTaskError('Invalid task status', Enums.TaskFailureCode.INVALID_TASK_STATUS, task);

        const inactiveAgentQueueTTLHours = parseInt(config.get('inactiveAgentQueueTTLHours'), 10);
        let inactiveAgentQueueTTL = inactiveAgentQueueTTLHours * 60 * 60 * 1000;
        if (inactiveAgentQueueTTL > 0) agentQueueProperties['expires'] = inactiveAgentQueueTTL;

        /// Tasks targeting one specific agent
        if (task.target == Enums.TaskDefTarget.SINGLE_SPECIFIC_AGENT) {
            routes = await GetSingleSpecificAgentTaskRoute(_teamId, task, logger, agentQueueProperties);

            if (!routes || (_.isArray(routes) && routes.length < 1)) {
                throw new LaunchTaskError('Target agent not available', Enums.TaskFailureCode.NO_AGENT_AVAILABLE, task);
            }
            const targetAgentId = new mongodb.ObjectId(task.targetAgentId);
            await agentService.updateAgentLastTaskAssignedTime(_teamId, targetAgentId, Date.now(), null, '_id');
        }

        /// For tasks requiring agents with designated tags, get a list of all active agents with all required tags.
        ///   If no agents exist with all required tags, log an error and return.
        else if (
            task.target &
            (Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)
        ) {
            if (!_.isPlainObject(task.requiredTags) || Object.keys(task.requiredTags).length < 1)
                throw new LaunchTaskError(
                    'Missing or invalid requiredTags property',
                    Enums.TaskFailureCode.MISSING_TARGET_TAGS,
                    task
                );

            const agentsWithRequiredTags: AgentSchema[] = await agentService.findActiveAgentsWithTags(
                _teamId,
                task.requiredTags,
                'lastHeartbeatTime propertyOverrides numActiveTasks attemptedRunAgentIds lastTaskAssignedTime'
            );
            if (agentsWithRequiredTags.length < 1) {
                throw new LaunchTaskError(
                    'No agent with required tags available',
                    Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
                    task
                );
            }

            if (task.target == Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS) {
                routes = await CreateTaskRoutesForAgents(_teamId, agentsWithRequiredTags, agentQueueProperties);
            } else {
                [routes, updatedTask] = await CreateTaskRouteForSingleAgent(
                    _teamId,
                    agentsWithRequiredTags,
                    task,
                    ActiveAgentSortFunction,
                    agentQueueProperties,
                    logger
                );
            }
        }

        /// For aws lambda objectives, route the task to a SaaSGlue aws lambda agent
        else if (task.target == Enums.TaskDefTarget.AWS_LAMBDA) {
            const sgAdminTeam = new mongodb.ObjectId(config.get('sgAdminTeam'));
            const requiredTags = config.get('awsLambdaRequiredTags');

            const agentsWithRequiredTags = await agentService.findActiveAgentsWithTags(
                sgAdminTeam,
                requiredTags,
                'lastHeartbeatTime propertyOverrides numActiveTasks attemptedRunAgentIds'
            );
            if (agentsWithRequiredTags.length < 1)
                throw new LaunchTaskError(
                    'No lambda runner agents available',
                    Enums.TaskFailureCode.NO_AGENT_AVAILABLE,
                    task
                );

            [routes, updatedTask] = await CreateTaskRouteForSingleAgent(
                sgAdminTeam,
                agentsWithRequiredTags,
                task,
                ActiveLambdaRunnerAgentSortFunction,
                agentQueueProperties,
                logger
            );
        }

        /// For objecives not requiring particular tags, route the task to a single agent or all agents
        else {
            const filter: any = await ConstructGeneralTaskHandlerAgentsMongoFilter();
            const agentsQuery = await agentService.findAllAgents(
                _teamId,
                filter,
                'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds'
            );
            if (!agentsQuery || (_.isArray(agentsQuery) && agentsQuery.length < 1)) {
                throw new LaunchTaskError('No agent available', Enums.TaskFailureCode.NO_AGENT_AVAILABLE, task);
            }

            if (task.target & Enums.TaskDefTarget.ALL_AGENTS) {
                routes = await CreateTaskRoutesForAgents(_teamId, agentsQuery, agentQueueProperties);
            } else {
                [routes, updatedTask] = await CreateTaskRouteForSingleAgent(
                    _teamId,
                    agentsQuery,
                    task,
                    ActiveAgentSortFunction,
                    agentQueueProperties,
                    logger
                );
            }
        }
    } catch (err) {
        if (err instanceof LaunchTaskError) {
            const failureCode: Enums.TaskFailureCode | undefined = (err as LaunchTaskError).getFailureCode();
            const failedTask: TaskSchema | undefined = (err as LaunchTaskError).getContext();
            logger.LogError(err.message, {
                Class: 'Shared',
                Method: 'GetTaskRoutes',
                _teamId,
                _jobId: failedTask._jobId,
                task: failedTask,
            });
            return {
                routes: null,
                error: err.message,
                failureCode: failureCode,
            };
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
    if (!task.targetAgentId) throw new ValidationError('Task targetAgentId property not set');

    let targetAgentId: string = task.targetAgentId;

    let runtimeVarsTask: any = {};
    if (task.runtimeVars) runtimeVarsTask = Object.assign(runtimeVarsTask, task.runtimeVars);

    let arrFound: string[] = task.targetAgentId.match(/@sgg?(\([^)]*\))/gi);
    if (arrFound) {
        // replace runtime variable in target agent id
        try {
            let varKey = arrFound[0].substr(5, arrFound[0].length - 6);
            if (varKey.substr(0, 1) === '"' && varKey.substr(varKey.length - 1, 1) === '"')
                varKey = varKey.slice(1, -1);
            if (runtimeVarsTask[varKey]) {
                targetAgentId = runtimeVarsTask[varKey]['value'];
            } else if (job.runtimeVars[varKey]) {
                targetAgentId = job.runtimeVars[varKey]['value'];
            } else {
                const teamVar = await teamVariableService.findTeamVariableByName(_teamId, varKey, 'value');
                if (_.isArray(teamVar) && teamVar.length > 0) targetAgentId = teamVar[0].value;
            }
        } catch (e) {
            logger.LogError('Error in arguments @sgg capture for targetAgentId string', {
                Class: 'TaskOutcomeService',
                Method: 'PublishTask',
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
let GetWaitingForAgentTasks = async (_teamId: mongodb.ObjectId, limit: number = 100): Promise<TaskSchema[]> => {
    let noAgentTasksFilter = {};
    noAgentTasksFilter['_teamId'] = _teamId;
    noAgentTasksFilter['status'] = { $eq: Enums.TaskStatus.WAITING_FOR_AGENT };
    noAgentTasksFilter['target'] = { $ne: Enums.TaskDefTarget.AWS_LAMBDA };
    // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
    return await taskService.findAllTasksInternal({
        filter: noAgentTasksFilter,
        responseFields: '_id _teamId',
        sortBy: '_id',
        limit: limit,
    });
};

let RepublishTasksWaitingForAgent = async (
    _teamId: mongodb.ObjectId,
    _agentId: mongodb.ObjectId,
    logger: BaseLogger,
    amqp: AMQPConnector
) => {
    const noAgentTasks: TaskSchema[] = await GetWaitingForAgentTasks(_teamId, 10);
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
let GetWaitingForLambdaRunnerTasks = async (limit: number = 1000): Promise<TaskSchema[]> => {
    let noAgentTasksFilter = {};
    noAgentTasksFilter['status'] = { $eq: Enums.TaskStatus.WAITING_FOR_AGENT };
    noAgentTasksFilter['target'] = { $eq: Enums.TaskDefTarget.AWS_LAMBDA };
    // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
    return await taskService.findAllTasksInternal({
        filter: noAgentTasksFilter,
        responseFields: '_id _teamId',
        sortBy: '_id',
        limit: limit,
    });
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
    const noAgentTasks: TaskSchema[] = await GetWaitingForLambdaRunnerTasks(10);
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
    noAgentTasksFilter['_teamId'] = _teamId;
    noAgentTasksFilter['status'] = {
        $in: [Enums.TaskStatus.WAITING_FOR_AGENT, Enums.TaskStatus.NOT_STARTED],
    };
    // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
    const noAgentTasks = await taskService.findAllTasksInternal({
        filter: noAgentTasksFilter,
    });
    if (_.isArray(noAgentTasks)) numNotStartedTasks = noAgentTasks.length;

    return numNotStartedTasks;
};

let GetAccessRightIdsForTeamUser = () => {
    return [3, 7, 8, 12, 16, 17, 18, 19, 21, 22, 27, 28, 29, 30, 41, 42, 43, 44, 45, 48, 49, 50, 51, 52, 53];
};

let GetAccessRightIdsForTeamAdmin = () => {
    return [
        3, 4, 7, 8, 12, 16, 17, 18, 19, 21, 22, 27, 28, 29, 30, 31, 32, 33, 36, 37, 38, 40, 41, 42, 43, 44, 45, 48, 49,
        50, 51, 52, 53, 56,
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

export { ActiveAgentSortFunction };
export { ActiveLambdaRunnerAgentSortFunction };
export { convertTeamAccessRightsToBitset };
export { CreateTaskRoutesForAgents };
export { CreateTaskRouteForSingleAgent };
export { GetAccessRightIdsForTeamUser };
export { GetAccessRightIdsForTeamAdmin };
export { GetAccessRightIdsForSGAdmin };
export { GetAccessRightIdsForSGAgent };
export { GetGlobalAccessRightId };
export { GetSingleAgentTaskRoute };
export { GetTargetAgentId };
export { GetTaskRoutes };
export { GetWaitingForLambdaRunnerTasks };
export { GetWaitingForAgentTasks };
export { IGetTaskRouteResult };
export { NumNotStartedTasks };
export { RepublishTasksWaitingForAgent };
export { RepublishTasksWaitingForLambdaRunner };
export { TaskReadyToPublish };
