import { convertData } from '../utils/ResponseConverters';
import { AgentSchema, AgentModel } from '../domain/Agent';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as config from 'config';
import * as _ from 'lodash';
import { BaseLogger } from '../../shared/KikiLogger';
import * as Enums from '../../shared/Enums';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { stepOutcomeService } from '../services/StepOutcomeService';
import { taskService } from '../services/TaskService';
import { localRestAccess } from '../utils/LocalRestAccess';


const userConfigurableProperties: string[] = ['maxActiveTasks', 'inactivePeriodWaitTime', 'inactiveAgentTask', 'handleGeneralTasks', 'trackSysInfo'];

const systemProperties: string[] = ['machineId', 'ipAddress', 'reportedVersion', 'lastHeartbeatTime', 'numActiveTasks', 'sysInfo', 'cron'];


export class AgentService {

    // Some services might need to add additional restrictions to bulk queries
    // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
    // public async updateBulkQuery(query): Promise<object> {
    //   // modify query here
    //   return query;
    // }

    public async findAllAgentsInternal(filter?: any, responseFields?: string, limit: number = 1000) {
        return AgentModel.find(filter).select(responseFields).limit(limit);
    }

    public async findAllAgents(_orgId: mongodb.ObjectId, filter?: any, responseFields?: string) {
        const defaultFilter = { _orgId };
        if (filter)
            filter = Object.assign(defaultFilter, filter);
        else
            filter = defaultFilter;
        return AgentModel.find(filter).select(responseFields);
    }

    public async findAgent(_orgId: mongodb.ObjectId, agentId: mongodb.ObjectId, responseFields?: string) {
        return AgentModel.findById(agentId).find({ _orgId }).select(responseFields);
    }


    public async findAgentByMachineName(_orgId: mongodb.ObjectId, machineId: string, responseFields?: string) {
        return await AgentModel.find({ _orgId, machineId }).select(responseFields);
    }


    public async findAgentsByTags(_orgId: mongodb.ObjectId, tags: any, responseFields?: string) {
        const activeAgentTimeoutSeconds = config.get('activeAgentTimeoutSeconds');
        let filter: any = { _orgId };
        filter.offline = false;
        filter.lastHeartbeatTime = { $gte: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 };
        for (let i = 0; i < tags.length; i++) {
            const key = `tags.${tags[0]['key']}`;
            const val = tags[0]['value'];
            filter[key] = val;
        }

        return await AgentModel.find({
            $and: [filter]
        }).select(responseFields);
    }


    public async findDisconnectedAgents(_orgId: mongodb.ObjectId, batchSize: number, responseFields?: string) {
        const activeAgentTimeoutSeconds = config.get('activeAgentTimeoutSeconds');
        let filter: any = { _orgId };
        filter.offline = false;
        filter.lastHeartbeatTime = { $lt: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 };

        return await AgentModel.find(filter).select(responseFields).limit(batchSize);
    }


    public async createAgentInternal(data: any): Promise<object> {
        const model = new AgentModel(data);
        await model.save();
        return;
    }


    public async createAgent(_orgId: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        data._orgId = _orgId;
        data.createDate = new Date();
        const agentModel = new AgentModel(data);
        const newAgent = await agentModel.save();

        await rabbitMQPublisher.publish(_orgId, "Agent", correlationId, PayloadOperation.CREATE, convertData(AgentSchema, newAgent));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findAgent(_orgId, newAgent._id, responseFields);
        }
        else {
            return newAgent; // fully populated model
        }
    }


    public async updateAgentHeartbeat(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string): Promise<object> {
        // for (let i = 0; i < Object.keys(data).length; i++) {
        //     const key = Object.keys(data)[i];
        //     if (systemProperties.indexOf(key) < 0)
        //         throw new ValidationError(`Invalid property - "${key}"`);
        // }

        const filter = { _id: id, _orgId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data).select('_id offline lastHeartbeatTime targetVersion');

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        let deltas = Object.assign({ _id: id, targetVersion: updatedAgent.targetVersion }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publish(_orgId, "Agent", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        let agentDeltas = _.cloneDeep(convertedDeltas);
        delete agentDeltas.sysInfo;
        await rabbitMQPublisher.publishToAgent(_orgId, id, agentDeltas);

        return updatedAgent; // fully populated model
    }


    public async updateAgentTags(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key != 'tags')
                throw new ValidationError(`Invalid key - "${key}"`);
        }

        data._orgId = _orgId;
        const filter = { _id: id, _orgId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_orgId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_orgId, "Agent", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }


    public async updateAgentProperties(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, userEmail: string, correlationId?: string, responseFields?: string): Promise<object> {
        let updates = {};
        let deletes = {};
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key == "_id")
                continue;
            if (userEmail != config.get('sgAdminUser')) {
                if (userConfigurableProperties.indexOf(key) < 0)
                    throw new ValidationError(`Invalid property - "${key}"`);
            } else {
                if (systemProperties.indexOf(key) >= 0)
                    throw new ValidationError(`Invalid property - "${key}"`);
            }
            if (data[key] != null)
                updates[`propertyOverrides.${key}`] = data[key];
            else
                deletes[`propertyOverrides.${key}`] = '';
        }

        const filter = { _id: id, _orgId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, { $set: updates, $unset: deletes }, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        let deltas = Object.assign({ _id: id }, { propertyOverrides: data });
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_orgId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_orgId, "Agent", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }


    public async processOrphanedTasks(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, logger: BaseLogger): Promise<object> {
        let result: any = { success: true };
        try {
            const agent = await AgentModel.findById(id);
            if (!agent)
                throw new MissingObjectError(`Agent with id '${id}" not found`);

            let orphanedTasksFilter = {};
            orphanedTasksFilter['_orgId'] = _orgId;
            orphanedTasksFilter['_agentId'] = new mongodb.ObjectId(agent._id);
            orphanedTasksFilter['status'] = { $lt: Enums.TaskStatus.SUCCEEDED };
            const orphanedTasks = await taskOutcomeService.findAllTaskOutcomesInternal(orphanedTasksFilter);
            if (_.isArray(orphanedTasks) && orphanedTasks.length > 0) {
                for (let i = 0; i < orphanedTasks.length; i++) {
                    const orphanedTask = orphanedTasks[i];

                    /// For auto restart tasks - cancel the existing taskoutcome and re-publish the task
                    if (orphanedTask.autoRestart) {
                        const stepOutcomeUpdates = {
                            dateCompleted: new Date().toISOString(),
                            status: Enums.StepStatus.INTERRUPTED
                        }

                        const taskOutcomeUpdates = {
                            dateCompleted: new Date().toISOString(),
                            status: Enums.TaskStatus.CANCELLED,
                            failureCode: Enums.TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY
                        }

                        try {
                            const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(_orgId, orphanedTask._id, { status: { $lte: Enums.StepStatus.RUNNING } }, '_id');
                            if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
                                for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
                                    const stepOutcome: any = taskStepOutcomesQuery[i];
                                    await stepOutcomeService.updateStepOutcome(_orgId, stepOutcome._id, stepOutcomeUpdates, null, null, '_id');
                                }
                            }
                            await taskOutcomeService.updateTaskOutcome(_orgId, orphanedTask._id, taskOutcomeUpdates, logger, { status: { $lt: Enums.TaskStatus.SUCCEEDED } }, null, '_id');
                            const queryTasks = await taskService.findAllJobTasks(_orgId, orphanedTask._jobId);
                            if (_.isArray(queryTasks) && queryTasks.length > 0) {
                                const task = queryTasks[0];
                                await localRestAccess.RestAPICall(`taskaction/republish/${task._id}`, 'POST', _orgId, null, null);
                            }
                        } catch (e) {
                            if (!(e instanceof MissingObjectError)) {
                                logger.LogError(`Error canceling orphaned autoRestart task: ${e}`, { orphanedTask });
                            }
                        }
                    }
                    /// For all other tasks - set the taskoutcome status to interrupted - if the agent comes back online and the task is still running or completed the taskoutcome will
                    ///   be updated accordingly - if the agent crashed the user can cancel the task using the monitor/api
                    else {
                        const stepOutcomeUpdates = {
                            dateCompleted: new Date().toISOString(),
                            status: Enums.StepStatus.INTERRUPTED
                        }

                        const taskOutcomeUpdates = {
                            dateCompleted: new Date().toISOString(),
                            status: Enums.TaskStatus.INTERRUPTED,
                            failureCode: Enums.TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY
                        }

                        try {
                            const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(_orgId, orphanedTask._id, { status: { $lte: Enums.StepStatus.RUNNING } }, '_id');
                            if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
                                for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
                                    const stepOutcome: any = taskStepOutcomesQuery[i];
                                    await stepOutcomeService.updateStepOutcome(_orgId, stepOutcome._id, stepOutcomeUpdates, null, null, '_id');
                                }
                            }
                            await taskOutcomeService.updateTaskOutcome(_orgId, orphanedTask._id, taskOutcomeUpdates, logger, { status: { $lt: Enums.TaskStatus.SUCCEEDED } });
                        } catch (e) {
                            if (!(e instanceof MissingObjectError)) {
                                logger.LogError(`Error canceling orphaned autoRestart task`, { orphanedTask });
                            }
                        }
                    }
                }
            }
            await this.updateAgentHeartbeat(_orgId, agent._id, { offline: true });
        } catch (err) {
            result.success = false;
            result.err = err;
        }

        return result;
    }
}

export const agentService = new AgentService();