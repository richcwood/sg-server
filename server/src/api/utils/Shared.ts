import * as config from 'config';
import { KikiStrings } from '../../shared/KikiStrings';
import { BaseLogger } from '../../shared/KikiLogger';
import { TaskSchema, TaskModel } from '../domain/Task';
import { agentService } from '../services/AgentService';
import * as Enums from '../../shared/Enums';
import * as util from 'util';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


const activeAgentTimeoutSeconds = config.get('activeAgentTimeoutSeconds');

let GetTaskRoutes = async (_orgId: mongodb.ObjectId, task: TaskSchema, logger: BaseLogger) => {
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
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _orgId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.TARGET_AGENT_NOT_SPECIFIED };
        }

        const targetAgentQuery = await agentService.findAllAgents(_orgId, { '_id': task.targetAgentId, 'offline': false, 'lastHeartbeatTime': { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 } }, 'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds');
        if (!targetAgentQuery || (_.isArray(targetAgentQuery) && targetAgentQuery.length === 0)) {
            const errMsg = `Target agent not available`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _orgId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
        }

        routes.push({ route: KikiStrings.GetAgentQueue(_orgId.toHexString(), task.targetAgentId), type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: task.targetAgentId });
    }
    /// For tasks requiring agents with designated tags, get a list of all active agents with all required tags. If no agents exist with all
    ///     required tags, log an error and return.
    else if (task.target & (Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)) {
        if (_.isPlainObject(task.requiredTags) && Object.keys(task.requiredTags).length > 0) {
            let agentsWithRequiredTags = [];
            const agents = await agentService.findAllAgents(_orgId, { 'offline': false, 'lastHeartbeatTime': { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 } }, 'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds');
            for (let i = 0; i < Object.keys(agents).length; i++) {
                if (!Object.keys(task.requiredTags).some(tagKey => !(tagKey in agents[i].tags) || (task.requiredTags[tagKey] != agents[i].tags[tagKey])))
                    agentsWithRequiredTags.push(agents[i]);
            }

            if (agentsWithRequiredTags.length < 1) {
                const errMsg = `No agents with tags required to complete this task`;
                logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _orgId, _jobId: task._jobId, task: task });
                return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
            }

            /// Publish the task in the queue of each agent. Otherwise, pick the agent that is currently the least utilized and send the task to it.
            if (task.target & (Enums.TaskDefTarget.ALL_AGENTS | (Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS))) {
                for (let i = 0; i < agentsWithRequiredTags.length; i++) {
                    const agentQueue = KikiStrings.GetAgentQueue(_orgId.toHexString(), agentsWithRequiredTags[i]._id);
                    routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentsWithRequiredTags[0]._id });
                }
            }
            else {
                // console.log(`GetTaskRoutes -> before filter -> ${JSON.stringify(agentsWithRequiredTags, null, 4)}`);
                const agentCandidates = _.filter(agentsWithRequiredTags, a => task.attemptedRunAgentIds.indexOf(a._id) < 0);
                // console.log(`GetTaskRoutes -> after filter -> ${JSON.stringify(agentCandidates, null, 4)}`);
                if (agentCandidates.length < 1) {
                    const errMsg = `No agents with required tags available to complete this task`;
                    logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _orgId, _jobId: task._jobId, task: task });
                    return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
                }

                agentCandidates.sort((a, b) => {
                    const a_unusedCapacity = a.propertyOverrides.maxActiveTasks - a.numActiveTasks;
                    const b_unusedCapacity = b.propertyOverrides.maxActiveTasks - b.numActiveTasks;
                    return (b_unusedCapacity > a_unusedCapacity) ? 1 : ((a_unusedCapacity > b_unusedCapacity) ? -1 : (b.lastHeartbeatTime > a.lastHeartbeatTime ? 1 : ((a.lastHeartbeatTime > b.lastHeartbeatTime) ? -1 : 0)));
                });
                // console.log(`GetTaskRoutes -> after sort -> ${JSON.stringify(agentCandidates, null, 4)}`);
                const agentQueue = KikiStrings.GetAgentQueue(_orgId.toHexString(), agentCandidates[0]._id);
                routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentCandidates[0]._id });
                updatedTask = await TaskModel.findOneAndUpdate({ _id: task._id, _orgId }, { $push: { attemptedRunAgentIds: agentCandidates[0]._id } }, { new: true });
            }
        } else {
            let errMsg = '';
            if (_.isPlainObject(task.requiredTags))
                errMsg = `Task target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but no required tags are specified`;
            else
                errMsg = `Task target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but required tags are incorrectly formatted`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _orgId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.MISSING_TARGET_TAGS };
        }
    }
    /// For objecives not requiring particular tags, route the task to a single agent or all agents
    else {
        const agentsQuery = await agentService.findAllAgents(_orgId, { $or: [{ 'propertyOverrides.handleGeneralTasks': { $exists: false } }, { 'propertyOverrides.handleGeneralTasks': true }], 'offline': false, 'lastHeartbeatTime': { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 } }, 'lastHeartbeatTime tags propertyOverrides numActiveTasks attemptedRunAgentIds');
        if (!agentsQuery || (_.isArray(agentsQuery) && agentsQuery.length === 0)) {
            const errMsg = `No agent available`;
            logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _orgId, _jobId: task._jobId, task: task });
            return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
        }

        if (task.target & Enums.TaskDefTarget.ALL_AGENTS) {
            for (let i = 0; i < Object.keys(agentsQuery).length; i++) {
                const agentQueue = KikiStrings.GetAgentQueue(_orgId.toHexString(), agentsQuery[i]._id);
                routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentsQuery[0]._id });
            }
        } else {
            const agentCandidates = _.filter(agentsQuery, a => task.attemptedRunAgentIds.indexOf(a._id) < 0);
            // console.log(`GetTaskRoutes -> after filter -> ${JSON.stringify(agentCandidates, null, 4)}`);
            if (agentCandidates.length < 1) {
                const errMsg = `No agents available to complete this task`;
                logger.LogError(errMsg, { Class: 'Shared', Method: 'GetTaskRoutes', _orgId, _jobId: task._jobId, task: task });
                return { routes: null, error: errMsg, failureCode: Enums.TaskFailureCode.NO_AGENT_AVAILABLE };
            }

            agentCandidates.sort((a, b) => {
                const a_unusedCapacity = a.propertyOverrides.maxActiveTasks - a.numActiveTasks;
                const b_unusedCapacity = b.propertyOverrides.maxActiveTasks - b.numActiveTasks;
                return (b_unusedCapacity > a_unusedCapacity) ? 1 : ((a_unusedCapacity > b_unusedCapacity) ? -1 : (b.lastHeartbeatTime > a.lastHeartbeatTime ? 1 : ((a.lastHeartbeatTime > b.lastHeartbeatTime) ? -1 : 0)));
            });
            // console.log(`GetTaskRoutes -> after sort -> ${JSON.stringify(agentCandidates, null, 4)}`);
            const agentQueue = KikiStrings.GetAgentQueue(_orgId.toHexString(), agentCandidates[0]._id);
            routes.push({ route: agentQueue, type: 'queue', queueAssertArgs: agentQueueProperties, targetAgentId: agentCandidates[0]._id });
            updatedTask = await TaskModel.findOneAndUpdate({ _id: task._id, _orgId }, { $push: { attemptedRunAgentIds: agentCandidates[0]._id } }, { new: true });
        }
    }

    return { routes: routes, task: updatedTask };
}


export { GetTaskRoutes };