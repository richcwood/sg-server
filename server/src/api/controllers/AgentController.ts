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
import { OrgSchema } from '../domain/Org';
import { orgService } from '../services/OrgService';
import { KikiStrings } from '../../shared/KikiStrings';
import { BaseLogger } from '../../shared/KikiLogger';
import { RabbitMQAdmin } from '../../shared/RabbitMQAdmin';
import { TaskStatus } from '../../shared/Enums';
import { TaskFailureCode } from '../../shared/Enums';
import { taskService } from '../services/TaskService';
import { AMQPConnector } from '../../shared/AMQPLib';
import { rabbitMQPublisher } from '../utils/RabbitMQPublisher';


const stompUrl = config.get('stompUrl');
const rmqVhost = config.get('rmqVhost');
const rmqAdminUrl = config.get('rmqAdminUrl');
const inactiveAgentQueueTTLHours = parseInt(config.get('inactiveAgentQueueTTLHours'), 10);
const activeAgentTimeoutSeconds = parseInt(config.get('activeAgentTimeoutSeconds'), 10);


let appName: string = 'TaskOutcomeService';
const amqpUrl = config.get('amqpUrl');
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();
let amqp: AMQPConnector = new AMQPConnector(appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => { }, logger);
amqp.Start();


let configureAgentQueues = async (_orgId: mongodb.ObjectId, _agentId: mongodb.ObjectId, logger: BaseLogger) => {
    let inactiveAgentQueueTTL = inactiveAgentQueueTTLHours * 60 * 60 * 1000;
    let org: OrgSchema = await orgService.findOrg(_orgId);

    const rmqAdmin = new RabbitMQAdmin(rmqAdminUrl, rmqVhost, logger);

    // let org = await this.mongoRepo.GetById(this.mongoRepo.ObjectIdFromString(_orgId), 'org', { rmqPassword: 1 });
    // const newUsername = _orgId.toString();
    // const defaultExchange = KikiStrings.GetOrgRoutingPrefix(_orgId.toHexString());
    const orgExchangeName = KikiStrings.GetOrgRoutingPrefix(_orgId.toHexString());

    await rmqAdmin.createUser(_orgId.toHexString(), org.rmqPassword, orgExchangeName);

    await rmqAdmin.createExchange(orgExchangeName, 'topic', false, true);

    const agentQueue = KikiStrings.GetAgentQueue(_orgId.toHexString(), _agentId.toHexString());
    await rmqAdmin.createQueue(agentQueue, false, true, inactiveAgentQueueTTL);
    await rmqAdmin.bindQueueToExchange(orgExchangeName, agentQueue, agentQueue);
    // await rmqAdmin.bindQueueToExchange(orgExchangeName, agentQueue, KikiStrings.GetAllAgentsQueue(_orgId.toHexString(), _orgId));

    const heartbeatQueue = KikiStrings.GetHeartbeatQueue(_orgId.toHexString());
    await rmqAdmin.createQueue(heartbeatQueue, false, true);
    await rmqAdmin.bindQueueToExchange(orgExchangeName, heartbeatQueue, heartbeatQueue);

    const agentUpdaterQueue = KikiStrings.GetAgentUpdaterQueue(_orgId.toHexString(), _agentId.toHexString());
    await rmqAdmin.createQueue(agentUpdaterQueue, false, true, inactiveAgentQueueTTL);
    await rmqAdmin.bindQueueToExchange(orgExchangeName, agentUpdaterQueue, agentUpdaterQueue);
};


let addServerPropertiesToAgent = async (agent: any) => {
    const org: OrgSchema = <OrgSchema>await orgService.findOrg(agent._orgId, 'rmqPassword');
    if (!org)
        throw new MissingObjectError(`Agent org "${agent._orgId.toHexString()}" not found`);
    return Object.assign(agent, {
        inactiveAgentQueueTTL: inactiveAgentQueueTTLHours * 60 * 60 * 1000,
        stompUrl: stompUrl,
        rmqAdminUrl: rmqAdminUrl,
        rmqUsername: agent._orgId.toHexString(),
        rmqPassword: org.rmqPassword,
        rmqVhost: rmqVhost
    });
}


export class AgentController {


    public async getManyAgents(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        defaultBulkGet({ _orgId }, req, resp, next, AgentSchema, AgentModel, agentService);
    }


    public async getAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
            const response: ResponseWrapper = (resp as any).body;
            const agent = await agentService.findAgent(_orgId, _agentId, req.query.responseFields);

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
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const machineId: string = <string>req.params.machineId;
            const response: ResponseWrapper = (resp as any).body;
            let agent = await agentService.findAgentByMachineName(_orgId, machineId, req.query.responseFields);

            if (_.isArray(agent) && agent.length === 0) {
                next(new MissingObjectError(`Agent '${machineId}" in org "${_orgId.toHexString()}' not found.`));
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
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const tags: any = JSON.parse(<string>req.params.tags);
            const response: ResponseWrapper = (resp as any).body;
            const agents = await agentService.findAgentsByTags(_orgId, tags, req.query.responseFields);

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
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const batchSize: number = parseInt(<string>req.headers.batchsize);
            const response: ResponseWrapper = (resp as any).body;
            const agents = await agentService.findDisconnectedAgents(_orgId, batchSize, req.query.responseFields);

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


    public async createAgent(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newAgent: AgentSchema = <AgentSchema>await agentService.createAgent(_orgId, convertRequestData(AgentSchema, req.body), req.header('correlationId'), req.query.responseFields);
            await configureAgentQueues(_orgId, newAgent._id, logger);
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
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let agent: any = await agentService.updateAgentHeartbeat(_orgId, _agentId, convertRequestData(AgentSchema, req.body), req.header('correlationId'));

            let tasksToCancel: mongodb.ObjectId[] = [];
            if (agent.offline || (agent.lastHeartbeatTime < new Date().getTime() - activeAgentTimeoutSeconds * 1000)) {
                rabbitMQPublisher.publishBrowserAlert(_orgId, `Agent ${agent.machineId} is back online`);
                let orphanedTasksFilter = {};
                orphanedTasksFilter['_orgId'] = _orgId;
                orphanedTasksFilter['_agentId'] = new mongodb.ObjectId(agent._id);
                orphanedTasksFilter['status'] = { $eq: TaskStatus.CANCELLED };
                orphanedTasksFilter['failureCode'] = { $eq: TaskFailureCode.AGENT_CRASHED_OR_LOST_CONNECTIVITY };
                const orphanedTasks = await taskOutcomeService.findAllTaskOutcomesInternal(orphanedTasksFilter, '_id');
                if (_.isArray(orphanedTasks) && orphanedTasks.length > 0) {
                    for (let i = 0; i < orphanedTasks.length; i++) {
                        tasksToCancel.push(orphanedTasks[i]._id);
                    }
                }

                let noAgentTasksFilter = {};
                noAgentTasksFilter['_orgId'] = _orgId;
                noAgentTasksFilter['status'] = { $eq: TaskStatus.WAITING_FOR_AGENT };
                // noAgentTasksFilter['failureCode'] = { $eq: TaskFailureCode.NO_AGENT_AVAILABLE };
                const noAgentTasks = await taskService.findAllTasksInternal(noAgentTasksFilter);
                if (_.isArray(noAgentTasks) && noAgentTasks.length > 0) {
                    for (let i = 0; i < noAgentTasks.length; i++) {
                        let updatedTask: any = await taskService.updateTask(_orgId, noAgentTasks[i]._id, { $pull: { attemptedRunAgentIds: agent._id } }, logger);
                        await taskOutcomeService.PublishTask(_orgId, updatedTask, logger, amqp);
                    }
                }
                // updatedAgent = await agentService.updateAgentHeartbeat(_orgId, _agentId, { offline: false }, req.header('correlationId'), req.query.responseFields);
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
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            let updatedAgent: any = await agentService.updateAgentTags(_orgId, _agentId, convertRequestData(AgentSchema, req.body), req.header('correlationId'), req.query.responseFields);

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
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const userEmail: string = <string>req.headers.email;
        const response: ResponseWrapper = resp['body'];
        try {
            let updatedAgent: any = await agentService.updateAgentProperties(_orgId, _agentId, convertRequestData(AgentSchema, req.body), userEmail, req.header('correlationId'), req.query.responseFields);

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


    public async processOrphanedTasks(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const _agentId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.agentId);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await agentService.processOrphanedTasks(_orgId, _agentId, logger);
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