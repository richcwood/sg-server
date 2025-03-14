import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { AgentSchema, AgentModel } from '../domain/Agent';
import { defaultBulkGet } from '../utils/BulkGet';
import { agentService } from '../services/AgentService';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import * as config from 'config';
import { TeamSchema } from '../domain/Team';
import { teamService } from '../services/TeamService';
import { SGStrings } from '../../shared/SGStrings';
import { BaseLogger } from '../../shared/SGLogger';
import { RabbitMQAdmin } from '../../shared/RabbitMQAdmin';
import { TaskStatus } from '../../shared/Enums';
import { TaskFailureCode } from '../../shared/Enums';
import { AMQPConnector } from '../../shared/AMQPLib';
import { rabbitMQPublisher } from '../utils/RabbitMQPublisher';
import {
    RepublishTasksWaitingForAgent,
    RepublishTasksWaitingForLambdaRunner,
    NumNotStartedTasks,
} from '../utils/Shared';
import { SGUtils } from '../../shared/SGUtils';

const inactiveAgentQueueTTLHours = parseInt(config.get('inactiveAgentQueueTTLHours'), 10);
const __ACTIVE_AGENT_TIMEOUT_SECONDS = parseInt(config.get('activeAgentTimeoutSeconds'), 10);
const awsLambdaRequiredTags = config.get('awsLambdaRequiredTags');

let errorHandler = (err, req: Request, resp: Response, next: NextFunction) => {
    if (err instanceof Error.CastError) {
        if (req.params && req.params.agentId)
            return next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
        else return next(new MissingObjectError(`Agent not found.`));
    } else {
        return next(err);
    }
};

let configureAgentQueues = async (_teamId: mongodb.ObjectId, _agentId: mongodb.ObjectId, logger: BaseLogger) => {
    let inactiveAgentQueueTTL = inactiveAgentQueueTTLHours * 60 * 60 * 1000;
    let team: TeamSchema = await teamService.findTeam(_teamId);

    const rmqAdmin = new RabbitMQAdmin(process.env.rmqAdminUrl, process.env.rmqVhost, logger);

    // let team = await this.mongoRepo.GetById(this.mongoRepo.ObjectIdFromString(_teamId), 'team', { rmqPassword: 1 });
    // const newUsername = _teamId.toString();
    // const defaultExchange = SGStrings.GetTeamRoutingPrefix(_teamId.toHexString());
    const teamExchangeName = SGStrings.GetTeamRoutingPrefix(_teamId.toHexString());

    await rmqAdmin.createUser(_teamId.toHexString(), team.rmqPassword, teamExchangeName);

    await rmqAdmin.createExchange(teamExchangeName, 'topic', false, true);

    const agentQueue = SGStrings.GetAgentQueue(_teamId.toHexString(), _agentId.toHexString());
    await rmqAdmin.createQueue(agentQueue, false, true, inactiveAgentQueueTTL);
    await rmqAdmin.bindQueueToExchange(teamExchangeName, agentQueue, agentQueue);
    // await rmqAdmin.bindQueueToExchange(teamExchangeName, agentQueue, SGStrings.GetAllAgentsQueue(_teamId.toHexString(), _teamId));

    const heartbeatQueue = SGStrings.GetHeartbeatQueue(_teamId.toHexString());
    await rmqAdmin.createQueue(heartbeatQueue, false, true);
    await rmqAdmin.bindQueueToExchange(teamExchangeName, heartbeatQueue, heartbeatQueue);

    const agentUpdaterQueue = SGStrings.GetAgentUpdaterQueue(_teamId.toHexString(), _agentId.toHexString());
    await rmqAdmin.createQueue(agentUpdaterQueue, false, true, inactiveAgentQueueTTL);
    await rmqAdmin.bindQueueToExchange(teamExchangeName, agentUpdaterQueue, agentUpdaterQueue);
};

let addServerPropertiesToAgent = async (agent: any) => {
    const team: TeamSchema = <TeamSchema>await teamService.findTeam(agent._teamId, 'rmqPassword');
    if (!team) throw new MissingObjectError(`Agent team "${agent._teamId.toHexString()}" not found`);
    return Object.assign(agent, {
        inactiveAgentQueueTTL: inactiveAgentQueueTTLHours * 60 * 60 * 1000,
        stompUrl: process.env.stompUrl,
        rmqAdminUrl: process.env.rmqAdminUrl,
        rmqUsername: agent._teamId.toHexString(),
        rmqPassword: team.rmqPassword,
        rmqVhost: process.env.rmqVhost,
    });
};

export class AgentController {
    public async getManyAgents(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, AgentSchema, AgentModel, agentService);
    }

    public async getAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
            const response: ResponseWrapper = (resp as any).body;
            const agent = await agentService.findAgent(_teamId, _agentId, <string>req.query.responseFields);

            if (!agent) {
                return next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            } else {
                response.data = convertResponseData(AgentSchema, agent);
                return next();
            }
        } catch (err) {
            return errorHandler(err, req, resp, next);
        }
    }

    public async getAgentFromMachineId(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const machineId: string = <string>req.params.machineId;
            const response: ResponseWrapper = (resp as any).body;

            let responseFields: string = <string>req.query.responseFields;
            if (responseFields && responseFields.indexOf('_teamId"') < 0) responseFields += ' _teamId';

            let agent = await agentService.findAgentByMachineId(_teamId, machineId, responseFields);

            if (!agent) {
                response.data = '';
                response.statusCode = ResponseCode.NOT_FOUND;
                return next();
                // return next(new MissingObjectError(`Agent '${machineId}" in team "${_teamId.toHexString()}' not found.`));
            } else {
                response.data = await addServerPropertiesToAgent(convertResponseData(AgentSchema, agent));
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async getAgentFromName(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const name: string = <string>req.params.name;
            const response: ResponseWrapper = (resp as any).body;

            let responseFields: string = <string>req.query.responseFields;
            if (responseFields && responseFields.indexOf('_teamId"') < 0) responseFields += ' _teamId';

            let agent = await agentService.findAgentByName(_teamId, name, responseFields);

            if (!agent) {
                response.data = '';
                response.statusCode = ResponseCode.NOT_FOUND;
                return next();
                // return next(new MissingObjectError(`Agent '${machineId}" in team "${_teamId.toHexString()}' not found.`));
            } else {
                response.data = await addServerPropertiesToAgent(convertResponseData(AgentSchema, agent));
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async getAgentByTags(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const tags: any = JSON.parse(<string>req.params.tags);
            const response: ResponseWrapper = (resp as any).body;
            const agents = await agentService.findActiveAgentsWithTags(_teamId, tags, <string>req.query.responseFields);

            if (!agents || (_.isArray(agents) && agents.length === 0)) {
                return next(new MissingObjectError(`No agent with tags ${req.params.tags} was found.`));
            } else {
                response.data = convertResponseData(AgentSchema, agents);
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async getDisconnectedAgents(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const batchSize: number = parseInt(<string>req.headers.batchsize);
            const response: ResponseWrapper = (resp as any).body;
            const agents = await agentService.findDisconnectedAgents(
                _teamId,
                batchSize,
                <string>req.query.responseFields
            );

            if (!agents || (_.isArray(agents) && agents.length === 0)) {
                return next(new MissingObjectError(`No disconnected agents found.`));
            } else {
                response.data = convertResponseData(AgentSchema, agents);
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await agentService.deleteAgent(
                _teamId,
                new mongodb.ObjectId(req.params.agentId),
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async createAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newAgent: AgentSchema = <AgentSchema>(
                await agentService.createAgent(
                    _teamId,
                    convertRequestData(AgentSchema, req.body),
                    req.header('correlationId'),
                    <string>req.query.responseFields
                )
            );
            await configureAgentQueues(_teamId, newAgent._id, logger);
            response.data = await addServerPropertiesToAgent(convertResponseData(AgentSchema, newAgent));
            response.statusCode = ResponseCode.CREATED;

            await RepublishTasksWaitingForAgent(_teamId, newAgent._id, logger, amqp);
            const numNotStartedTasks = await NumNotStartedTasks(_teamId);
            if (numNotStartedTasks > 0) {
                await SGUtils.sleep(1000);
                await RepublishTasksWaitingForAgent(_teamId, newAgent._id, logger, amqp);
            }

            if (_teamId == process.env.sgAdminTeam && _.isArray(newAgent.tags) && newAgent.tags.length > 0) {
                let isLambdaRunnerAgent: boolean = true;
                for (let i = 0; i < Object.keys(awsLambdaRequiredTags).length; i++) {
                    const key = Object.keys(awsLambdaRequiredTags)[i];
                    if (newAgent.tags[key] != awsLambdaRequiredTags[key]) {
                        isLambdaRunnerAgent = false;
                        break;
                    }
                }

                if (isLambdaRunnerAgent) await RepublishTasksWaitingForLambdaRunner(newAgent._id, logger, amqp);
            }

            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateTeamAgentsTargetVersion(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.teamId);
        const version: string = req.params.targetVersion;
        const response: ResponseWrapper = resp['body'];
        try {
            const res = await agentService.updateTeamAgentsTargetVersion(_teamId, { targetVersion: version });

            response.data = res;
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateAgentTargetVersion(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.body, null, 4));
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.teamId);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const version: string = req.params.targetVersion;
        const response: ResponseWrapper = resp['body'];
        try {
            let updatedAgent: any = await agentService.updateAgentTargetVersion(
                _teamId,
                _agentId,
                version,
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedAgent) && updatedAgent.length === 0) {
                return next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            } else {
                response.data = convertResponseData(AgentSchema, updatedAgent);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }

    public async updateAgentHeartbeat(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentHeartbeat -> ', JSON.stringify(req.body, null, 4));
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let agent: any = await agentService.updateAgentHeartbeat(
                _teamId,
                _agentId,
                convertRequestData(AgentSchema, req.body),
                logger,
                req.header('correlationId')
            );

            let tasksToCancel: mongodb.ObjectId[] = [];
            if (
                agent.offline ||
                agent.lastHeartbeatTime == null ||
                agent.lastHeartbeatTime < new Date().getTime() - __ACTIVE_AGENT_TIMEOUT_SECONDS * 2 * 1000
            ) {
                if (
                    agent.offline ||
                    agent.lastHeartbeatTime < new Date().getTime() - __ACTIVE_AGENT_TIMEOUT_SECONDS * 1000
                ) {
                    rabbitMQPublisher.publishBrowserAlert(_teamId, `Agent ${agent.machineId} is back online`);
                    let orphanedTasksFilter = {};
                    orphanedTasksFilter['_teamId'] = _teamId;
                    orphanedTasksFilter['_agentId'] = new mongodb.ObjectId(agent._id);
                    orphanedTasksFilter['status'] = { $eq: TaskStatus.CANCELLED };
                    orphanedTasksFilter['failureCode'] = { $eq: TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY };
                    const orphanedTasks = await taskOutcomeService.findAllTaskOutcomesInternal(
                        orphanedTasksFilter,
                        '_id'
                    );
                    if (_.isArray(orphanedTasks) && orphanedTasks.length > 0) {
                        for (let i = 0; i < orphanedTasks.length; i++) {
                            tasksToCancel.push(orphanedTasks[i]._id);
                        }
                    }
                }

                await RepublishTasksWaitingForAgent(_teamId, _agentId, logger, amqp);
                const numNotStartedTasks = await NumNotStartedTasks(_teamId);
                if (numNotStartedTasks > 0) {
                    await SGUtils.sleep(1000);
                    await RepublishTasksWaitingForAgent(_teamId, _agentId, logger, amqp);
                }

                if (_teamId == process.env.sgAdminTeam) {
                    let isLambdaRunnerAgent: boolean = true;
                    for (let i = 0; i < Object.keys(awsLambdaRequiredTags).length; i++) {
                        const key = Object.keys(awsLambdaRequiredTags)[i];
                        if (agent.tags[key] != awsLambdaRequiredTags[key]) {
                            isLambdaRunnerAgent = false;
                            break;
                        }
                    }

                    if (isLambdaRunnerAgent) await RepublishTasksWaitingForLambdaRunner(_agentId, logger, amqp);
                }
                // updatedAgent = await agentService.updateAgentHeartbeat(_teamId, _agentId, { offline: false }, req.header('correlationId'), (<string>req.query.responseFields));
            }

            if (_.isArray(agent) && agent.length === 0) {
                return next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            } else {
                response.data = convertResponseData(AgentSchema, agent);
                if (tasksToCancel.length > 0) {
                    // console.log('updateAgentHeartbeat -> cancel -> tasksToCancel ->', JSON.stringify(tasksToCancel, null, 4));
                    response.data['tasksToCancel'] = tasksToCancel;
                    // console.log('updateAgentHeartbeat -> cancel -> response.data ->', JSON.stringify(response.data, null, 4));
                }
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }

    public async updateAgentTags(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.headers, null, 4));
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let responseFields: string = <string>req.query.responseFields;
            if (!responseFields) responseFields = '';
            else responseFields = responseFields.trim();
            if (responseFields.indexOf('tags') < 0) responseFields += ' tags';
            let updatedAgent: any = await agentService.updateAgentTags(
                _teamId,
                _agentId,
                convertRequestData(AgentSchema, req.body),
                req.header('correlationId'),
                responseFields
            );

            await RepublishTasksWaitingForAgent(_teamId, _agentId, logger, amqp);
            const numNotStartedTasks = await NumNotStartedTasks(_teamId);
            if (numNotStartedTasks > 0) {
                await SGUtils.sleep(1000);
                await RepublishTasksWaitingForAgent(_teamId, _agentId, logger, amqp);
            }

            if (_teamId == process.env.sgAdminTeam) {
                let isLambdaRunnerAgent: boolean = true;
                for (let i = 0; i < Object.keys(awsLambdaRequiredTags).length; i++) {
                    const key = Object.keys(awsLambdaRequiredTags)[i];
                    if (updatedAgent.tags[key] != awsLambdaRequiredTags[key]) {
                        isLambdaRunnerAgent = false;
                        break;
                    }
                }

                if (isLambdaRunnerAgent) await RepublishTasksWaitingForLambdaRunner(_agentId, logger, amqp);
            }

            if (_.isArray(updatedAgent) && updatedAgent.length === 0) {
                return next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            } else {
                response.data = convertResponseData(AgentSchema, updatedAgent);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }

    public async updateAgentProperties(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.body, null, 4));
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const userEmail: string = <string>req.headers.email;
        const response: ResponseWrapper = resp['body'];
        try {
            let responseFields: string = <string>req.query.responseFields;
            if (req.body.maxActiveTasks && responseFields) {
                if (responseFields.indexOf('propertyOverrides') < 0) {
                    responseFields += ' propertyOverrides';
                }
                if (responseFields.indexOf('numActiveTasks') < 0) {
                    responseFields += ' numActiveTasks';
                }
                if (responseFields.indexOf('tags') < 0) {
                    responseFields += ' tags';
                }
            }
            let updatedAgent: any = await agentService.updateAgentProperties(
                _teamId,
                _agentId,
                convertRequestData(AgentSchema, req.body),
                userEmail,
                req.header('correlationId'),
                responseFields
            );

            if (_.isArray(updatedAgent) && updatedAgent.length === 0) {
                return next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            } else {
                if (
                    req.body.maxActiveTasks &&
                    'numActiveTasks' in updatedAgent &&
                    'propertyOverrides' in updatedAgent &&
                    'maxActiveTasks' in updatedAgent.propertyOverrides
                ) {
                    if (parseInt(updatedAgent.propertyOverrides.maxActiveTasks) > updatedAgent.numActiveTasks) {
                        await RepublishTasksWaitingForAgent(_teamId, _agentId, logger, amqp);
                        const numNotStartedTasks = await NumNotStartedTasks(_teamId);
                        if (numNotStartedTasks > 0) {
                            await SGUtils.sleep(1000);
                            await RepublishTasksWaitingForAgent(_teamId, _agentId, logger, amqp);
                        }

                        if (_teamId == process.env.sgAdminTeam) {
                            let isLambdaRunnerAgent: boolean = true;
                            for (let i = 0; i < Object.keys(awsLambdaRequiredTags).length; i++) {
                                const key = Object.keys(awsLambdaRequiredTags)[i];
                                if (updatedAgent.tags[key] != awsLambdaRequiredTags[key]) {
                                    isLambdaRunnerAgent = false;
                                    break;
                                }
                            }

                            if (isLambdaRunnerAgent) await RepublishTasksWaitingForLambdaRunner(_agentId, logger, amqp);
                        }
                    }
                }

                response.data = convertResponseData(AgentSchema, updatedAgent);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }

    public async updateAgentName(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.body, null, 4));
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let updatedAgent: any = await agentService.updateAgentName(
                _teamId,
                _agentId,
                convertRequestData(AgentSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedAgent) && updatedAgent.length === 0) {
                return next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            } else {
                response.data = convertResponseData(AgentSchema, updatedAgent);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }

    public async stopAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.body, null, 4));
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            await rabbitMQPublisher.publishToAgent(_teamId, _agentId, { stopAgent: 1 });
            response.data = {};
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }

    public async processOrphanedTasks(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await agentService.processOrphanedTasks(_teamId, _agentId, logger, amqp);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }
}

export const agentController = new AgentController();
