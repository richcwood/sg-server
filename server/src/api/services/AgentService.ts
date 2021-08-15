import { convertData } from '../utils/ResponseConverters';
import { AgentSchema, AgentModel } from '../domain/Agent';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as config from 'config';
import * as _ from 'lodash';
import { BaseLogger } from '../../shared/SGLogger';
import * as Enums from '../../shared/Enums';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { stepOutcomeService } from '../services/StepOutcomeService';
import { taskService } from '../services/TaskService';
import { TaskDefModel } from '../domain/TaskDef';
import { localRestAccess } from '../utils/LocalRestAccess';


const userConfigurableProperties: string[] = ['maxActiveTasks', 'inactivePeriodWaitTime', 'inactiveAgentJob', 'handleGeneralTasks', 'trackSysInfo'];

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

    public async findAllAgents(_teamId: mongodb.ObjectId, filter?: any, responseFields?: string, limit: number = 1000) {
        const defaultFilter = { _teamId };
        if (filter)
            filter = Object.assign(defaultFilter, filter);
        else
            filter = defaultFilter;
        return AgentModel.find(filter).select(responseFields).limit(limit);
    }

    public async findAgent(_teamId: mongodb.ObjectId, agentId: mongodb.ObjectId, responseFields?: string) {
        return AgentModel.findById(agentId).find({ _teamId }).select(responseFields);
    }


    public async findAgentByMachineId(_teamId: mongodb.ObjectId, machineId: string, responseFields?: string) {
        return await AgentModel.find({ _teamId, machineId }).select(responseFields);
    }


    public async findAgentByName(_teamId: mongodb.ObjectId, name: string, responseFields?: string) {
        return await AgentModel.find({ _teamId, name }).select(responseFields);
    }


    public async findAgentsByTags(_teamId: mongodb.ObjectId, tags: any, responseFields?: string) {
        const activeAgentTimeoutSeconds = config.get('activeAgentTimeoutSeconds');
        let filter: any = { _teamId };
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


    public async findDisconnectedAgents(_teamId: mongodb.ObjectId, batchSize: number, responseFields?: string) {
        const activeAgentTimeoutSeconds = config.get('activeAgentTimeoutSeconds');
        let filter: any = { _teamId };
        filter.offline = false;
        filter.lastHeartbeatTime = { $lt: (new Date().getTime()) - parseInt(activeAgentTimeoutSeconds) * 1000 };

        return await AgentModel.find(filter).select(responseFields).limit(batchSize);
    }


    public async deleteAgent(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId?: string): Promise<object> {
        let cntTaskDefsTargetingThisAgent = await TaskDefModel.count({_teamId, targetAgentId: id.toHexString()});
        if (cntTaskDefsTargetingThisAgent > 0)
            throw new ValidationError(`There are ${cntTaskDefsTargetingThisAgent} job tasks that target this agent`);

        const deleted = await AgentModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, "Agent", correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }


    public async createAgentInternal(data: any): Promise<object> {
        const model = new AgentModel(data);
        await model.save();
        return;
    }


    public async createAgent(_teamId: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        data._teamId = _teamId;
        data.createDate = new Date();
        const agentModel = new AgentModel(data);
        const newAgent = await agentModel.save();

        await rabbitMQPublisher.publish(_teamId, "Agent", correlationId, PayloadOperation.CREATE, convertData(AgentSchema, newAgent));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findAgent(_teamId, newAgent._id, responseFields);
        }
        else {
            return newAgent; // fully populated model
        }
    }


    public async updateTeamAgentsTargetVersion(_teamId: mongodb.ObjectId, data: any): Promise<object> {
        const filter = { _teamId };
        await AgentModel.updateMany(filter, data);

        return {success: true};
    }


    public async updateAgentTargetVersion(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, version: string, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, { targetVersion: version }, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        return updatedAgent; // fully populated model
    }


    public async updateAgentLastTaskAssignedTime(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, lastTaskAssignedTime: number, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, { lastTaskAssignedTime }, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        return updatedAgent; // fully populated model
    }


    public async updateAgentHeartbeat(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string): Promise<object> {
        // for (let i = 0; i < Object.keys(data).length; i++) {
        //     const key = Object.keys(data)[i];
        //     if (systemProperties.indexOf(key) < 0)
        //         throw new ValidationError(`Invalid property - "${key}"`);
        // }

        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data).select('_id offline lastHeartbeatTime targetVersion tags');

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        let deltas = Object.assign({ _id: id, targetVersion: updatedAgent.targetVersion }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publish(_teamId, "Agent", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        let agentDeltas = _.cloneDeep(convertedDeltas);
        delete agentDeltas.sysInfo;
        await rabbitMQPublisher.publishToAgent(_teamId, id, agentDeltas);

        return updatedAgent; // fully populated model
    }


    public async updateAgentTags(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key != 'tags')
                throw new ValidationError(`Invalid key - "${key}"`);
        }

        data._teamId = _teamId;
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_teamId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_teamId, "Agent", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }


    public async updateAgentProperties(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, userEmail: string, correlationId?: string, responseFields?: string): Promise<object> {
        let updates = {};
        let deletes = {};
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key == "_id")
                continue;
            if (userEmail != config.get('sgAdminUser')) {
                if (userConfigurableProperties.indexOf(key) < 0) {
                    if (systemProperties.indexOf(key) < 0)
                        delete data.key;
                    else
                        throw new ValidationError(`Unable to modify property - "${key}"`);
                }
            } else {
                if (systemProperties.indexOf(key) < 0)
                    delete data.key;
                    // throw new ValidationError(`Invalid property - "${key}"`);
            }
            if (data[key] != null)
                updates[`propertyOverrides.${key}`] = data[key];
            else
                deletes[`propertyOverrides.${key}`] = '';
        }

        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, { $set: updates, $unset: deletes }, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        let deltas = Object.assign({ _id: id }, { propertyOverrides: data });
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_teamId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_teamId, "Agent", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }


    public async updateAgentName(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key != 'name')
                throw new ValidationError(`Invalid key - "${key}"`);
        }

        data._teamId = _teamId;
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(`Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_teamId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_teamId, "Agent", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }


    public async processOrphanedTasks(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, logger: BaseLogger): Promise<object> {
        let result: any = { success: true };
        try {
            const agent = await AgentModel.findById(id);
            if (!agent)
                throw new MissingObjectError(`Agent with id '${id}" not found`);

            let orphanedTasksFilter = {};
            orphanedTasksFilter['_teamId'] = _teamId;
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
                            const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(_teamId, orphanedTask._id, { status: { $lte: Enums.StepStatus.RUNNING } }, '_id');
                            if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
                                for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
                                    const stepOutcome: any = taskStepOutcomesQuery[i];
                                    await stepOutcomeService.updateStepOutcome(_teamId, stepOutcome._id, stepOutcomeUpdates, null, null, '_id');
                                }
                            }
                            await taskOutcomeService.updateTaskOutcome(_teamId, orphanedTask._id, taskOutcomeUpdates, logger, { status: { $lt: Enums.TaskStatus.SUCCEEDED } }, null, '_id');
                            const queryTasks = await taskService.findAllJobTasks(_teamId, orphanedTask._jobId);
                            if (_.isArray(queryTasks) && queryTasks.length > 0) {
                                const task = queryTasks[0];
                                await localRestAccess.RestAPICall(`taskaction/republish/${task._id}`, 'POST', _teamId, null, null);
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
                            const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(_teamId, orphanedTask._id, { status: { $lte: Enums.StepStatus.RUNNING } }, '_id');
                            if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
                                for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
                                    const stepOutcome: any = taskStepOutcomesQuery[i];
                                    await stepOutcomeService.updateStepOutcome(_teamId, stepOutcome._id, stepOutcomeUpdates, null, null, '_id');
                                }
                            }
                            await taskOutcomeService.updateTaskOutcome(_teamId, orphanedTask._id, taskOutcomeUpdates, logger, { status: { $lt: Enums.TaskStatus.SUCCEEDED } });
                        } catch (e) {
                            if (!(e instanceof MissingObjectError)) {
                                logger.LogError(`Error canceling orphaned autoRestart task`, { orphanedTask });
                            }
                        }
                    }
                }
            }
            await this.updateAgentHeartbeat(_teamId, agent._id, { offline: true });
        } catch (err) {
            result.success = false;
            result.err = err;
        }

        return result;
    }
}

export const agentService = new AgentService();