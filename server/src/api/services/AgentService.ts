import { XMLParser } from 'fast-xml-parser';

import * as config from 'config';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

import { AgentSchema, AgentModel } from '../domain/Agent';
import { TaskDefModel } from '../domain/TaskDef';

import { stepOutcomeService } from '../services/StepOutcomeService';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { taskService } from '../services/TaskService';

import { AMQPConnector } from '../../shared/AMQPLib';
import * as Enums from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';

import { MissingObjectError, ValidationError } from '../utils/Errors';
import { localRestAccess } from '../utils/LocalRestAccess';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { convertData } from '../utils/ResponseConverters';

const userConfigurableProperties: string[] = [
    'maxActiveTasks',
    'inactivePeriodWaitTime',
    'inactiveAgentJob',
    'handleGeneralTasks',
    'trackSysInfo',
];

const systemProperties: string[] = [
    'machineId',
    'ipAddress',
    'reportedVersion',
    'lastHeartbeatTime',
    'numActiveTasks',
    'sysInfo',
    'cron',
    'winTasks',
];

const __ACTIVE_AGENT_TIMEOUT_SECONDS = config.get('activeAgentTimeoutSeconds');

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

    public async findAllAgents(
        _teamId: mongodb.ObjectId,
        filter?: any,
        responseFields?: string,
        limit: number = 1000
    ): Promise<AgentSchema[]> {
        const defaultFilter = { _teamId };
        if (filter) filter = Object.assign(defaultFilter, filter);
        else filter = defaultFilter;
        return AgentModel.find(filter).select(responseFields).limit(limit);
    }

    public async findAgent(
        _teamId: mongodb.ObjectId,
        agentId: mongodb.ObjectId,
        responseFields?: string
    ): Promise<AgentSchema | null> {
        const result: AgentSchema[] = await AgentModel.findById(agentId).find({ _teamId }).select(responseFields);
        if (_.isArray(result) && result.length > 0) return result[0];
        return null;
    }

    public async findAgentByMachineId(
        _teamId: mongodb.ObjectId,
        machineId: string,
        responseFields?: string
    ): Promise<AgentSchema | null> {
        const result: AgentSchema[] = await AgentModel.find({ _teamId, machineId }).select(responseFields);
        if (_.isArray(result) && result.length > 0) return result[0];
        return null;
    }

    public async findAgentByName(
        _teamId: mongodb.ObjectId,
        name: string,
        responseFields?: string
    ): Promise<AgentSchema | null> {
        const result: AgentSchema[] = await AgentModel.find({ _teamId, name }).select(responseFields);
        if (_.isArray(result) && result.length > 0) return result[0];
        return null;
    }

    public async findActiveAgentsWithTags(
        _teamId: mongodb.ObjectId,
        tags: any,
        responseFields?: string
    ): Promise<AgentSchema[]> {
        if (!_.isPlainObject(tags) || Object.keys(tags).length < 1)
            throw new ValidationError('Missing or invalid tags');
        let filter: any = { _teamId: _teamId };
        filter.offline = false;
        filter.lastHeartbeatTime = {
            $gte: new Date().getTime() - parseInt(__ACTIVE_AGENT_TIMEOUT_SECONDS) * 1000,
        };
        filter['$and'] = [];
        for (let i = 0; i < Object.keys(tags).length; i++) {
            const tagKey = Object.keys(tags)[i];
            const tagFilterKey: string = `tags.${tagKey}`;
            let tagFilter: any = {};
            tagFilter[tagFilterKey] = tags[tagKey];
            filter['$and'].push(tagFilter);
        }

        const agents: AgentSchema[] = await AgentModel.find(filter).select(responseFields);
        return agents;
    }

    public async findDisconnectedAgents(
        _teamId: mongodb.ObjectId,
        batchSize: number,
        responseFields?: string
    ): Promise<AgentSchema[]> {
        const __ACTIVE_AGENT_TIMEOUT_SECONDS = config.get('activeAgentTimeoutSeconds');
        let filter: any = { _teamId };
        filter.offline = false;
        filter.lastHeartbeatTime = { $lt: new Date().getTime() - parseInt(__ACTIVE_AGENT_TIMEOUT_SECONDS) * 1000 };

        return await AgentModel.find(filter).select(responseFields).limit(batchSize);
    }

    public async deleteAgent(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId?: string): Promise<object> {
        let cntTaskDefsTargetingThisAgent = await TaskDefModel.count({ _teamId, targetAgentId: id.toHexString() });
        if (cntTaskDefsTargetingThisAgent > 0)
            throw new ValidationError(`There are ${cntTaskDefsTargetingThisAgent} job tasks that target this agent`);

        const deleted = await AgentModel.deleteOne({ _id: id, _teamId });

        await rabbitMQPublisher.publish(_teamId, 'Agent', correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }

    public async createAgentInternal(data: any): Promise<AgentSchema> {
        const model = new AgentModel(data);
        await model.save();
        return;
    }

    public async createAgent(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<AgentSchema> {
        data._teamId = _teamId;
        data.createDate = new Date();
        const agentModel = new AgentModel(data);
        const newAgent = await agentModel.save();

        await rabbitMQPublisher.publish(
            _teamId,
            'Agent',
            correlationId,
            PayloadOperation.CREATE,
            convertData(AgentSchema, newAgent)
        );

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findAgent(_teamId, newAgent._id, responseFields);
        } else {
            return newAgent; // fully populated model
        }
    }

    public async updateTeamAgentsTargetVersion(_teamId: mongodb.ObjectId, data: any): Promise<object> {
        const filter = { _teamId };
        await AgentModel.updateMany(filter, data);

        return { success: true };
    }

    public async updateAgentTargetVersion(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        version: string,
        correlationId?: string,
        responseFields?: string
    ): Promise<AgentSchema> {
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(
            filter,
            { targetVersion: version },
            { new: true }
        ).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(
                `Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        return updatedAgent; // fully populated model
    }

    public async updateAgentLastTaskAssignedTime(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        lastTaskAssignedTime: number,
        correlationId?: string,
        responseFields?: string
    ): Promise<AgentSchema> {
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, { lastTaskAssignedTime }, { new: true }).select(
            responseFields
        );

        if (!updatedAgent)
            throw new MissingObjectError(
                `Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        return updatedAgent; // fully populated model
    }

    public async updateAgentHeartbeat(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        logger: BaseLogger,
        correlationId?: string
    ): Promise<AgentSchema> {
        if (data.winTasks) {
            const parser = new XMLParser();
            let formattedWinTasks = [];
            for (let winTask of data.winTasks) {
                try {
                    const parsed = parser.parse(winTask);
                    formattedWinTasks.push(JSON.parse(JSON.stringify(parsed)));
                } catch (e) {
                    logger.LogError(`Error canceling orphaned autoRestart task: ${e}`, { winTask });
                }
            }
            data.winTasks = formattedWinTasks;
        }

        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data).select(
            '_id offline lastHeartbeatTime targetVersion tags'
        );

        if (!updatedAgent)
            throw new MissingObjectError(
                `Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        let deltas = Object.assign({ _id: id, targetVersion: updatedAgent.targetVersion }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publish(_teamId, 'Agent', correlationId, PayloadOperation.UPDATE, convertedDeltas);

        let agentDeltas = _.cloneDeep(convertedDeltas);
        delete agentDeltas.sysInfo;
        await rabbitMQPublisher.publishToAgent(_teamId, id, agentDeltas);

        return updatedAgent; // fully populated model
    }

    public async updateAgentTags(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<AgentSchema> {
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key != 'tags') throw new ValidationError(`Invalid key - "${key}"`);
        }

        data._teamId = _teamId;
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(
                `Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_teamId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_teamId, 'Agent', correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }

    public async updateAgentProperties(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        userEmail: string,
        correlationId?: string,
        responseFields?: string
    ): Promise<AgentSchema> {
        let updates = {};
        let deletes = {};
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key == '_id') continue;
            if (userEmail != config.get('sgAdminUser')) {
                if (userConfigurableProperties.indexOf(key) < 0) {
                    if (systemProperties.indexOf(key) < 0) delete data.key;
                    else throw new ValidationError(`Unable to modify property - "${key}"`);
                }
            } else {
                if (systemProperties.indexOf(key) < 0) delete data.key;
                // throw new ValidationError(`Invalid property - "${key}"`);
            }
            if (data[key] != null) updates[`propertyOverrides.${key}`] = data[key];
            else deletes[`propertyOverrides.${key}`] = '';
        }

        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(
            filter,
            { $set: updates, $unset: deletes },
            { new: true }
        ).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(
                `Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        let deltas = Object.assign({ _id: id }, { propertyOverrides: data });
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_teamId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_teamId, 'Agent', correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }

    public async updateAgentName(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<AgentSchema> {
        for (let i = 0; i < Object.keys(data).length; i++) {
            const key = Object.keys(data)[i];
            if (key != 'name') throw new ValidationError(`Invalid key - "${key}"`);
        }

        data._teamId = _teamId;
        const filter = { _id: id, _teamId };
        const updatedAgent = await AgentModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedAgent)
            throw new MissingObjectError(
                `Agent with id '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(AgentSchema, deltas);
        await rabbitMQPublisher.publishToAgent(_teamId, id, convertedDeltas);
        await rabbitMQPublisher.publish(_teamId, 'Agent', correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedAgent; // fully populated model
    }

    public async processOrphanedTasks(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        logger: BaseLogger,
        amqp: AMQPConnector
    ): Promise<object> {
        let result: any = { success: true };
        try {
            const agent = await AgentModel.findById(id);
            if (!agent) throw new MissingObjectError(`Agent with id '${id}" not found`);

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
                            status: Enums.StepStatus.INTERRUPTED,
                        };

                        const taskOutcomeUpdates = {
                            dateCompleted: new Date().toISOString(),
                            status: Enums.TaskStatus.CANCELLED,
                            failureCode: Enums.TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY,
                        };

                        try {
                            const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(
                                _teamId,
                                orphanedTask._id,
                                { status: { $lte: Enums.StepStatus.RUNNING } },
                                '_id'
                            );
                            if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
                                for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
                                    const stepOutcome: any = taskStepOutcomesQuery[i];
                                    await stepOutcomeService.updateStepOutcome(
                                        _teamId,
                                        stepOutcome._id,
                                        stepOutcomeUpdates,
                                        null,
                                        null,
                                        '_id'
                                    );
                                }
                            }
                            await taskOutcomeService.updateTaskOutcome(
                                _teamId,
                                orphanedTask._id,
                                taskOutcomeUpdates,
                                logger,
                                amqp,
                                { status: { $lt: Enums.TaskStatus.SUCCEEDED } },
                                null,
                                '_id'
                            );
                            const queryTasks = await taskService.findAllJobTasks(_teamId, orphanedTask._jobId);
                            if (_.isArray(queryTasks) && queryTasks.length > 0) {
                                const task = queryTasks[0];
                                await localRestAccess.RestAPICall(
                                    `taskaction/republish/${task._id}`,
                                    'POST',
                                    _teamId.toHexString(),
                                    null,
                                    null
                                );
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
                            status: Enums.StepStatus.INTERRUPTED,
                        };

                        const taskOutcomeUpdates = {
                            dateCompleted: new Date().toISOString(),
                            status: Enums.TaskStatus.INTERRUPTED,
                            failureCode: Enums.TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY,
                        };

                        try {
                            const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(
                                _teamId,
                                orphanedTask._id,
                                { status: { $lte: Enums.StepStatus.RUNNING } },
                                '_id'
                            );
                            if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
                                for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
                                    const stepOutcome: any = taskStepOutcomesQuery[i];
                                    await stepOutcomeService.updateStepOutcome(
                                        _teamId,
                                        stepOutcome._id,
                                        stepOutcomeUpdates,
                                        null,
                                        null,
                                        '_id'
                                    );
                                }
                            }
                            await taskOutcomeService.updateTaskOutcome(
                                _teamId,
                                orphanedTask._id,
                                taskOutcomeUpdates,
                                logger,
                                amqp,
                                {
                                    status: { $lt: Enums.TaskStatus.SUCCEEDED },
                                }
                            );
                        } catch (e) {
                            if (!(e instanceof MissingObjectError)) {
                                logger.LogError(`Error canceling orphaned autoRestart task`, { orphanedTask });
                            }
                        }
                    }
                }
            }
            await this.updateAgentHeartbeat(_teamId, agent._id, { offline: true }, logger);
        } catch (err) {
            result.success = false;
            result.err = err;
        }

        return result;
    }
}

export const agentService = new AgentService();
