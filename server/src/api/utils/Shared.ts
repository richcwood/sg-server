import * as config from 'config';
import { SGStrings } from '../../shared/SGStrings';
import { BaseLogger } from '../../shared/SGLogger';
import { TaskSchema, TaskModel } from '../domain/Task';
import { agentService } from '../services/AgentService';
import { taskService } from '../services/TaskService';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import * as Enums from '../../shared/Enums';
import { AMQPConnector } from '../../shared/AMQPLib';
import { SGUtils } from '../../shared/SGUtils';
import * as util from 'util';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


const activeAgentTimeoutSeconds = config.get('activeAgentTimeoutSeconds');

let GetTaskRoutes = async (_teamId: mongodb.ObjectId, task: TaskSchema, logger: BaseLogger) => {
    let routes: any[] = [];
    let updatedTask = undefined;

    const agentQueueProperties: any = { exclusive: false, durable: true, autoDelete: false };
    const inactiveAgentQueueTTLHours = parseInt(config.get('inactiveAgentQueueTTLHours'), 10);
    let inactiveAgentQueueTTL = inactiveAgentQueueTTLHours * 60 * 60 * 1000;
    if (inactiveAgentQueueTTL > 0)
        agentQueueProperties['expires'] = inactiveAgentQueueTTL;

    /// For tasks where the executing agent is specified, route using the agent id
    if (task.target == Enums.TaskDefTarget.SINGLE_SPECIFIC_AGENT) {
        if (!task.targetAgentId) {
            const errMsg = `Task target is "SINGLE_SPECIFIC_AGENT" but targetAgentId is missing`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.TARGET_AGENT_NOT_SPECIFIED };
        }

        const targetAgentQuery = await agentService.findAllAgents(_teamId, { '_id': task.targetAgentId, 'offline': false, 'lastHeartbeatTime': { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 } }, 'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds');
        if (!targetAgentQuery || (_.isArray(targetAgentQuery) && targetAgentQuery.length === 0)) {
            const errMsg = `Target agent not available`;
            logger.LogDebug(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
        }

        routes.push({ route: SGStrings.GetAgentQueue(_teamId.toHexString(), task.targetAgentId), type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: task.targetAgentId });
    }
    /// For tasks requiring agents with designated tags, get a list of all active agents with all required tags. If no agents exist with all
    ///     required tags, log an error and return.
    else if (task.target & (Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)) {
        if (_.isPlainObject(task.requiredTags) && Object.keys(task.requiredTags).length > 0) {
            let agentsWithRequiredTags = [];
            const agents = await agentService.findAllAgents(_teamId, { 'offline': false, 'lastHeartbeatTime': { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 } }, 'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds');
            for (let i = 0; i < Object.keys(agents).length; i++) {
                if (!Object.keys(task.requiredTags).some(tagKey => !(tagKey in agents[i].tags) || (task.requiredTags[tagKey] != agents[i].tags[tagKey])))
                    agentsWithRequiredTags.push(agents[i]);
            }

            if (agentsWithRequiredTags.length < 1) {
                const errMsg = `No agents with tags required to complete this task`;
                logger.LogDebug(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
                return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
            }

            /// Publish the task in the queue of each agent. Otherwise, pick the agent that is currently the least utilized and send the task to it.
            if (task.target & (Enums.TaskDefTarget.ALL_AGENTS | (Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS))) {
                for (let i = 0; i < agentsWithRequiredTags.length; i++) {
                    const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agentsWithRequiredTags[i]._id);
                    routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentsWithRequiredTags[0]._id });
                }
            }
            else {
                // console.log(`GetTaskRoutes -> before filter -> ${JSON.stringify(agentsWithRequiredTags, null, 4)}`);
                const agentCandidates = _.filter(agentsWithRequiredTags, a => task.attemptedRunAgentIds.indexOf(a._id) < 0);
                // console.log(`GetTaskRoutes -> after filter -> ${JSON.stringify(agentCandidates, null, 4)}`);
                if (agentCandidates.length < 1) {
                    const errMsg = `No agents with required tags available to complete this task`;
                    logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
                    return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
                }

                agentCandidates.sort((a, b) => {
                    const a_unusedCapacity = a.propertyOverrides.maxActiveTasks - a.numActiveTasks;
                    const b_unusedCapacity = b.propertyOverrides.maxActiveTasks - b.numActiveTasks;
                    return (b_unusedCapacity > a_unusedCapacity) ? 1 : ((a_unusedCapacity > b_unusedCapacity) ? -1 : (b.lastHeartbeatTime > a.lastHeartbeatTime ? 1 : ((a.lastHeartbeatTime > b.lastHeartbeatTime) ? -1 : 0)));
                });
                // console.log(`GetTaskRoutes -> after sort -> ${JSON.stringify(agentCandidates, null, 4)}`);
                const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agentCandidates[0]._id);
                routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentCandidates[0]._id });
                updatedTask = await TaskModel.findOneAndUpdate({ _id: task._id, _teamId }, { $push: { attemptedRunAgentIds: agentCandidates[0]._id } }, { new: true });
            }
        } else {
            let errMsg = '';
            if (_.isPlainObject(task.requiredTags))
                errMsg = `Task target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but no required tags are specified`;
            else
                errMsg = `Task target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but required tags are incorrectly formatted`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.MISSING_TARGET_TAGS };
        }
    }
    /// For aws lambda objectives, route the task to a saas glue aws lambda agent
    else if (task.target == Enums.TaskDefTarget.AWS_LAMBDA) {
        let agentsWithRequiredTags = [];
        const sgAdminTeam = new mongodb.ObjectId(config.get('sgAdminTeam'));
        const requiredTags = config.get('awsLambdaRequiredTags');
        const agents = await agentService.findAllAgents(sgAdminTeam, { 'offline': false, 'lastHeartbeatTime': { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 } }, 'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds');
        for (let i = 0; i < Object.keys(agents).length; i++) {
            if (!Object.keys(requiredTags).some(tagKey => !(tagKey in agents[i].tags) || (requiredTags[tagKey] != agents[i].tags[tagKey])))
                agentsWithRequiredTags.push(agents[i]);
        }

        if (agentsWithRequiredTags.length < 1) {
            const errMsg = `No lambda runner agents available`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
        }

        const agentCandidates = _.filter(agentsWithRequiredTags, a => task.attemptedRunAgentIds.indexOf(a._id) < 0);
        // console.log(`GetTaskRoutes -> after filter -> ${JSON.stringify(agentCandidates, null, 4)}`);
        if (agentCandidates.length < 1) {
            const errMsg = `No lambda runner agents available`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', sgAdminTeam, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
        }

        agentCandidates.sort((a, b) => {
            const a_unusedCapacity = a.propertyOverrides.maxActiveTasks - a.numActiveTasks;
            const b_unusedCapacity = b.propertyOverrides.maxActiveTasks - b.numActiveTasks;
            return (b_unusedCapacity > a_unusedCapacity) ? 1 : ((a_unusedCapacity > b_unusedCapacity) ? -1 : (b.lastHeartbeatTime > a.lastHeartbeatTime ? 1 : ((a.lastHeartbeatTime > b.lastHeartbeatTime) ? -1 : 0)));
        });
        // console.log(`GetTaskRoutes -> after sort -> ${JSON.stringify(agentCandidates, null, 4)}`);
        const agentQueue = SGStrings.GetAgentQueue(sgAdminTeam.toHexString(), agentCandidates[0]._id);
        routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentCandidates[0]._id });
        updatedTask = await TaskModel.findOneAndUpdate({ _id: task._id, _teamId }, { $push: { attemptedRunAgentIds: agentCandidates[0]._id } }, { new: true });
    } 
    /// For objecives not requiring particular tags, route the task to a single agent or all agents
    else {
        const agentsQuery = await agentService.findAllAgents(_teamId, { $or: [{ 'propertyOverrides.handleGeneralTasks': { $exists: false } }, { 'propertyOverrides.handleGeneralTasks': true }], 'offline': false, 'lastHeartbeatTime': { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 } }, 'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds');
        if (!agentsQuery || (_.isArray(agentsQuery) && agentsQuery.length === 0)) {
            const errMsg = `No agent available`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
        }

        if (task.target & Enums.TaskDefTarget.ALL_AGENTS) {
            for (let i = 0; i < Object.keys(agentsQuery).length; i++) {
                const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agentsQuery[i]._id);
                routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentsQuery[0]._id });
            }
        } else {
            const agentCandidates = _.filter(agentsQuery, a => task.attemptedRunAgentIds.indexOf(a._id) < 0);
            // console.log(`GetTaskRoutes -> after filter -> ${JSON.stringify(agentCandidates, null, 4)}`);
            if (agentCandidates.length < 1) {
                const errMsg = `No agents available to complete this task`;
                logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _teamId, _jobId: task._jobId, task: task });
                return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
            }

            agentCandidates.sort((a, b) => {
                const a_unusedCapacity = a.propertyOverrides.maxActiveTasks - a.numActiveTasks;
                const b_unusedCapacity = b.propertyOverrides.maxActiveTasks - b.numActiveTasks;
                return (b_unusedCapacity > a_unusedCapacity) ? 1 : ((a_unusedCapacity > b_unusedCapacity) ? -1 : (b.lastHeartbeatTime > a.lastHeartbeatTime ? 1 : ((a.lastHeartbeatTime > b.lastHeartbeatTime) ? -1 : 0)));
            });
            // console.log(`GetTaskRoutes -> after sort -> ${JSON.stringify(agentCandidates, null, 4)}`);
            const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), agentCandidates[0]._id);
            routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentCandidates[0]._id });
            updatedTask = await TaskModel.findOneAndUpdate({ _id: task._id, _teamId }, { $push: { attemptedRunAgentIds: agentCandidates[0]._id } }, { new: true });
        }
    }

    return { routes: routes, task: updatedTask };
}


let CheckWaitingForAgentTasks = async (_teamId: mongodb.ObjectId, _agentId: mongodb.ObjectId, logger: BaseLogger, amqp: AMQPConnector) => {
    let noAgentTasksFilter = {};
    noAgentTasksFilter['_teamId'] = _teamId;
    noAgentTasksFilter['status'] = { $eq: Enums.TaskStatus.WAITING_FOR_AGENT };
    // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
    const noAgentTasks = await taskService.findAllTasksInternal(noAgentTasksFilter);
    if (_.isArray(noAgentTasks) && noAgentTasks.length > 0) {
        for (let i = 0; i < noAgentTasks.length; i++) {
            let updatedTask: any;
            if (_agentId)
                updatedTask = await taskService.updateTask(_teamId, noAgentTasks[i]._id, { $pull: { attemptedRunAgentIds: _agentId } }, logger);
            else
                updatedTask = await taskService.updateTask(_teamId, noAgentTasks[i]._id, { attemptedRunAgentIds: [] }, logger);

            const tasks = await taskService.findAllJobTasks(_teamId, updatedTask._jobId, 'toRoutes');
            const tasksToRoutes = SGUtils.flatMap(x => x, tasks.map((t) => SGUtils.flatMap(x => x[0], t.toRoutes)));
            if ((!updatedTask.up_dep || (Object.keys(updatedTask.up_dep).length < 1)) && (tasksToRoutes.indexOf(updatedTask.name) < 0)) {
                if (updatedTask.status == Enums.TaskStatus.WAITING_FOR_AGENT) {
                    updatedTask.status = Enums.TaskStatus.NOT_STARTED;
                    updatedTask = await taskService.updateTask(_teamId, updatedTask._id, { status: updatedTask.status }, logger, { status: Enums.TaskStatus.WAITING_FOR_AGENT }, null, null);
                    await taskOutcomeService.PublishTask(_teamId, updatedTask, logger, amqp);
                }
            }
        }
    }
}


export { GetTaskRoutes };
export { CheckWaitingForAgentTasks };
