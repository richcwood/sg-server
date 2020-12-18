import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { AgentSchema, AgentModel } from '../domain/Agent';
import { defaultBulkGet } from '../utils/BulkGet';
import { agentService } from '../services/AgentService';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { CastError } from 'mongoose';
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
import { taskService } from '../services/TaskService';
import { AMQPConnector } from '../../shared/AMQPLib';
import { rabbitMQPublisher } from '../utils/RabbitMQPublisher';
import { CheckWaitingForAgentTasks, CheckWaitingForLambdaRunnerTasks } from '../utils/Shared';


const stompUrl = config.get('stompUrl');
const rmqVhost = config.get('rmqVhost');
const rmqAdminUrl = config.get('rmqAdminUrl');
const inactiveAgentQueueTTLHours = parseInt(config.get('inactiveAgentQueueTTLHours'), 10);
const activeAgentTimeoutSeconds = parseInt(config.get('activeAgentTimeoutSeconds'), 10);
const adminTeamId = config.get("sgAdminTeam");
const awsLambdaRequiredTags = config.get("awsLambdaRequiredTags");


let appName: string = 'TaskOutcomeService';
const amqpUrl = config.get('amqpUrl');
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();
let amqp: AMQPConnector = new AMQPConnector(appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => { }, logger);
amqp.Start();


let configureAgentQueues = async (_teamId: mongodb.ObjectId, _agentId: mongodb.ObjectId, logger: BaseLogger) => {
    let inactiveAgentQueueTTL = inactiveAgentQueueTTLHours * 60 * 60 * 1000;
    let team: TeamSchema = await teamService.findTeam(_teamId);

    const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost, logger);

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
    if (!team)
        throw new MissingObjectError(`Agent team "${agent._teamId.toHexString()}" not found`);
    return Object.assign(agent, {
        inactiveAgentQueueTTL: inactiveAgentQueueTTLHours * 60 * 60 * 1000,
        stompUrl: stompUrl,
        rmqAdminUrl: rmqAdminUrl,
        rmqUsername: agent._teamId.toHexString(),
        rmqPassword: team.rmqPassword,
        rmqVhost: rmqVhost
    });
}


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
            const agent = await agentService.findAgent(_teamId, _agentId, (<string>req.query.responseFields));

            if (!agent || (_.isArray(agent) && agent.length === 0)) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                response.data = convertResponseData(AgentSchema, agent[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async getAgentFromMachineId(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const machineId: string = <string>req.params.machineId;
            const response: ResponseWrapper = (resp as any).body;
            let agent = await agentService.findAgentByMachineName(_teamId, machineId, (<string>req.query.responseFields));

            if (_.isArray(agent) && agent.length === 0) {
                response.data = '';
                response.statusCode = ResponseCode.NOT_FOUND;
                next();            
                // next(new MissingObjectError(`Agent '${machineId}" in team "${_teamId.toHexString()}' not found.`));
            }
            else {
                response.data = await addServerPropertiesToAgent(convertResponseData(AgentSchema, agent[0]));
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async getAgentByTags(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const tags: any = JSON.parse(<string>req.params.tags);
            const response: ResponseWrapper = (resp as any).body;
            const agents = await agentService.findAgentsByTags(_teamId, tags, (<string>req.query.responseFields));

            if (!agents || (_.isArray(agents) && agents.length === 0)) {
                next(new MissingObjectError(`No agent with tags ${req.params.tags} was found.`));
            }
            else {
                response.data = convertResponseData(AgentSchema, agents);
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async getDisconnectedAgents(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const batchSize: number = parseInt(<string>req.headers.batchsize);
            const response: ResponseWrapper = (resp as any).body;
            const agents = await agentService.findDisconnectedAgents(_teamId, batchSize, (<string>req.query.responseFields));

            if (!agents || (_.isArray(agents) && agents.length === 0)) {
                next(new MissingObjectError(`No disconnected agents found.`));
            }
            else {
                response.data = convertResponseData(AgentSchema, agents);
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async deleteAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await agentService.deleteAgent(_teamId, new mongodb.ObjectId(req.params.agentId), req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async createAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newAgent: AgentSchema = <AgentSchema>await agentService.createAgent(_teamId, convertRequestData(AgentSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
            await configureAgentQueues(_teamId, newAgent._id, logger);
            response.data = await addServerPropertiesToAgent(convertResponseData(AgentSchema, newAgent));
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateAgentHeartbeat(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentHeartbeat -> ', JSON.stringify(req.body, null, 4));
        const logger: BaseLogger = (<any>req).logger;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let agent: any = await agentService.updateAgentHeartbeat(_teamId, _agentId, convertRequestData(AgentSchema, req.body), req.header('correlationId'));

            let tasksToCancel: mongodb.ObjectId[] = [];
            if (agent.offline || agent.lastHeartbeatTime == null || (agent.lastHeartbeatTime < new Date().getTime() - activeAgentTimeoutSeconds * 1000)) {
                rabbitMQPublisher.publishBrowserAlert(_teamId, `Agent ${agent.machineId} is back online`);
                let orphanedTasksFilter = {};
                orphanedTasksFilter['_teamId'] = _teamId;
                orphanedTasksFilter['_agentId'] = new mongodb.ObjectId(agent._id);
                orphanedTasksFilter['status'] = { $eq: TaskStatus.CANCELLED };
                orphanedTasksFilter['failureCode'] = { $eq: TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY };
                const orphanedTasks = await taskOutcomeService.findAllTaskOutcomesInternal(orphanedTasksFilter, '_id');
                if (_.isArray(orphanedTasks) && orphanedTasks.length > 0) {
                    for (let i = 0; i < orphanedTasks.length; i++) {
                        tasksToCancel.push(orphanedTasks[i]._id);
                    }
                }

                await CheckWaitingForAgentTasks(_teamId, _agentId, logger, amqp);

                if (_teamId == adminTeamId) {
                    let isLambdaRunnerAgent: boolean = true;
                    for (let i = 0; i < Object.keys(awsLambdaRequiredTags).length; i++) {
                        const key = Object.keys(awsLambdaRequiredTags)[i];
                        if (agent.tags[key] != awsLambdaRequiredTags[key]) {
                            isLambdaRunnerAgent = false;
                            break;
                        }
                    }

                    if (isLambdaRunnerAgent)
                        await CheckWaitingForLambdaRunnerTasks(_agentId, logger, amqp);
                }
                // updatedAgent = await agentService.updateAgentHeartbeat(_teamId, _agentId, { offline: false }, req.header('correlationId'), (<string>req.query.responseFields));
            }

            if (_.isArray(agent) && agent.length === 0) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                response.data = convertResponseData(AgentSchema, agent);
                if (tasksToCancel.length > 0) {
                    // console.log('updateAgentHeartbeat -> cancel -> tasksToCancel ->', JSON.stringify(tasksToCancel, null, 4));
                    response.data['tasksToCancel'] = tasksToCancel;
                    // console.log('updateAgentHeartbeat -> cancel -> response.data ->', JSON.stringify(response.data, null, 4));
                }
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async updateAgentTags(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.headers, null, 4));
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let responseFields: string = (<string>req.query.responseFields);
            if (!responseFields)
                responseFields = '';
            else
                responseFields = responseFields.trim();
            if (responseFields.indexOf('tags') < 0)
                responseFields += ' tags';
            let updatedAgent: any = await agentService.updateAgentTags(_teamId, _agentId, convertRequestData(AgentSchema, req.body), req.header('correlationId'), responseFields);

            await CheckWaitingForAgentTasks(_teamId, _agentId, logger, amqp);

            if (_teamId == adminTeamId) {
                let isLambdaRunnerAgent: boolean = true;
                for (let i = 0; i < Object.keys(awsLambdaRequiredTags).length; i++) {
                    const key = Object.keys(awsLambdaRequiredTags)[i];
                    if (updatedAgent.tags[key] != awsLambdaRequiredTags[key]) {
                        isLambdaRunnerAgent = false;
                        break;
                    }
                }

                if (isLambdaRunnerAgent)
                    await CheckWaitingForLambdaRunnerTasks(_agentId, logger, amqp);
            }

            if (_.isArray(updatedAgent) && updatedAgent.length === 0) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                response.data = convertResponseData(AgentSchema, updatedAgent);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async updateAgentProperties(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.body, null, 4));
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const userEmail: string = <string>req.headers.email;
        const response: ResponseWrapper = resp['body'];
        try {
            let responseFields: string = (<string>req.query.responseFields);
            if (req.body.maxActiveTasks && responseFields) {
                if (responseFields.indexOf('propertyOverrides') < 0) {
                    responseFields += " propertyOverrides";
                }
                if (responseFields.indexOf('numActiveTasks') < 0) {
                    responseFields += " numActiveTasks";
                }
                if (responseFields.indexOf('tags') < 0) {
                    responseFields += " tags";
                }
            }
            let updatedAgent: any = await agentService.updateAgentProperties(_teamId, _agentId, convertRequestData(AgentSchema, req.body), userEmail, req.header('correlationId'), responseFields);

            if (_.isArray(updatedAgent) && updatedAgent.length === 0) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                if (req.body.maxActiveTasks && ('numActiveTasks' in updatedAgent) && ('propertyOverrides' in updatedAgent) && ('maxActiveTasks' in updatedAgent.propertyOverrides)) {
                    if (parseInt(updatedAgent.propertyOverrides.maxActiveTasks) > updatedAgent.numActiveTasks) {
                        await CheckWaitingForAgentTasks(_teamId, _agentId, logger, amqp);

                        if (_teamId == adminTeamId) {
                            let isLambdaRunnerAgent: boolean = true;
                            for (let i = 0; i < Object.keys(awsLambdaRequiredTags).length; i++) {
                                const key = Object.keys(awsLambdaRequiredTags)[i];
                                if (updatedAgent.tags[key] != awsLambdaRequiredTags[key]) {
                                    isLambdaRunnerAgent = false;
                                    break;
                                }
                            }
            
                            if (isLambdaRunnerAgent)
                                await CheckWaitingForLambdaRunnerTasks(_agentId, logger, amqp);
                        }
                    }
                }
            
                response.data = convertResponseData(AgentSchema, updatedAgent);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async updateAgentName(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.body, null, 4));
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let updatedAgent: any = await agentService.updateAgentName(_teamId, _agentId, convertRequestData(AgentSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));

            if (_.isArray(updatedAgent) && updatedAgent.length === 0) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                response.data = convertResponseData(AgentSchema, updatedAgent);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async stopAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        // console.log('updateAgentProperties -> ', JSON.stringify(req.body, null, 4));
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            await rabbitMQPublisher.publishToAgent(_teamId, _agentId, {stopAgent: 1});
            response.data = {};
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async processOrphanedTasks(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await agentService.processOrphanedTasks(_teamId, _agentId, logger);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            // If req.params.agentId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Agent ${req.params.agentId} not found.`));
            }
            else {
                next(err);
            }
        }
    }
}

export const agentController = new AgentController();