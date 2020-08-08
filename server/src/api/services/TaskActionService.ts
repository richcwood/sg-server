import { convertData } from '../utils/ResponseConverters';
import { TaskSchema, TaskModel } from '../domain/Task';
import { taskService } from '../services/TaskService';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { TaskStatus, TaskFailureCode, TaskDefTarget } from '../../shared/Enums';
import { GetTaskRoutes } from '../utils/Shared';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import { BaseLogger } from '../../shared/KikiLogger';
import * as config from 'config';
import { AMQPConnector } from '../../shared/AMQPLib';
import { KikiUtils } from '../../shared/KikiUtils';
import { KikiStrings } from '../../shared/KikiStrings';


let appName: string = 'TaskActionService';
const amqpUrl = config.get('amqpUrl');
const rmqVhost = config.get('rmqVhost');
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();
let amqp: AMQPConnector = new AMQPConnector(appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => { }, logger);
amqp.Start();


export class TaskActionService {

    public async republishTask(_orgId: mongodb.ObjectId, _taskId: mongodb.ObjectId, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: _taskId, _orgId };

        let taskUpdateQuery = {};
        taskUpdateQuery['$unset'] = { 'runtimeVars.route': '' };
        taskUpdateQuery['$set'] = { 'route': '', 'status': null, 'failureCode': null };
        let updatedTask: TaskSchema = await TaskModel.findOneAndUpdate(filter, taskUpdateQuery, { new: true });
        if (!updatedTask) {
            logger.LogError(`Task ${_taskId} not found with filter ${JSON.stringify(filter)}`, {});
            return {};
        }
        // throw new ValidationError(`Task ${_taskId} not found with filter ${JSON.stringify(filter)}`);

        // if (!updatedTask) {
        //     const taskQuery = await TaskModel.findById(_taskId).find({ _orgId }).select('status');
        //     if (!taskQuery || (_.isArray(taskQuery) && taskQuery.length < 1))
        //         throw new ValidationError(`Job ${_taskId} not found`);
        //     updatedTask = taskQuery[0];
        //     throw new ValidationError(`Task ${_taskId} cannot be interrupted - current status should be "RUNNING" but is "${JobStatus[jobQuery[0].status]}"`);
        // }

        await rabbitMQPublisher.publish(_orgId, "Task", correlationId, PayloadOperation.UPDATE, convertData(TaskSchema, updatedTask));

        await taskOutcomeService.PublishTask(_orgId, updatedTask, logger, amqp);

        if (responseFields) {
            return taskService.findTask(_orgId, _taskId, responseFields);
        }
        else {
            return updatedTask; // fully populated model
        }
    }


    public async requeueTask(_orgId: mongodb.ObjectId, _taskId: mongodb.ObjectId, data: any, logger: BaseLogger, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: _taskId, _orgId, status: TaskStatus.PUBLISHED };

        let taskUpdateQuery = {};
        taskUpdateQuery['$unset'] = { 'runtimeVars.route': '' };
        taskUpdateQuery['$set'] = { 'route': '', 'status': null, 'failureCode': null };
        let updatedTask: any = await TaskModel.findOneAndUpdate(filter, taskUpdateQuery, { new: true });
        if (!updatedTask)
            return {};

        const task: any = data.task;
        const queue: string = data.queue;

        let agentId;
        const agentIdMatch = /(?<=agent-)([A-Za-z0-9]*)/g;
        let arrParams: string[] = queue.match(agentIdMatch);
        if (_.isArray(arrParams) && arrParams.length > 0)
            agentId = new mongodb.ObjectId(arrParams[0]);

        const routeTaskInfo: any = { target: TaskDefTarget.SINGLE_SPECIFIC_AGENT, targetAgentId: agentId, _jobId: task._jobId };
        let getTaskRoutesRes = await GetTaskRoutes(_orgId, routeTaskInfo, logger);
        if (!getTaskRoutesRes.routes) {
            let deltas: any;
            let taskFailed: boolean = false;
            if (getTaskRoutesRes.failureCode == TaskFailureCode.TARGET_AGENT_NOT_SPECIFIED) {
                taskFailed = true;
                deltas = { status: TaskStatus.FAILED, failureCode: getTaskRoutesRes.failureCode, route: 'fail' };
                updatedTask = await taskService.updateTask(_orgId, _taskId, deltas, logger)
            } else if (getTaskRoutesRes.failureCode == TaskFailureCode.NO_AGENT_AVAILABLE) {
                deltas = { status: TaskStatus.WAITING_FOR_AGENT, failureCode: getTaskRoutesRes.failureCode, route: 'fail' };
                updatedTask = await taskService.updateTask(_orgId, _taskId, deltas, logger)
            } else {
                taskFailed = true;
                deltas = { status: TaskStatus.FAILED, failureCode: getTaskRoutesRes.failureCode, route: 'fail' };
                updatedTask = await taskService.updateTask(_orgId, _taskId, deltas, logger)
                logger.LogError(`Unhandled failure code: ${getTaskRoutesRes.failureCode}`, { Class: 'TaskOutcomeService', Method: 'PublishTask', _orgId, task: task });
            }

            if (taskFailed) {
                await KikiUtils.OnTaskFailed(_orgId, task, TaskFailureCode[getTaskRoutesRes.failureCode], logger);
            }
        } else {
            const routes = getTaskRoutesRes.routes;
            let ttl = config.get('defaultQueuedTaskTTL');

            for (let i = 0; i < routes.length; i++) {
                if (routes[i]['type'] == 'queue') {
                    await amqp.PublishQueue(KikiStrings.GetOrgExchangeName(_orgId.toHexString()), routes[i]['route'], task, routes[i]['queueAssertArgs'], { 'expiration': ttl });
                } else {
                    await amqp.PublishRoute(KikiStrings.GetOrgExchangeName(_orgId.toHexString()), routes[i]['route'], task);
                }
            }

            updatedTask = await taskService.updateTask(_orgId, _taskId, { status: TaskStatus.PUBLISHED, route: '', failureCode: '' }, logger);
        }

        await rabbitMQPublisher.publish(_orgId, "Task", correlationId, PayloadOperation.UPDATE, convertData(TaskSchema, updatedTask));

        if (responseFields) {
            return taskService.findTask(_orgId, _taskId, responseFields);
        }
        else {
            return updatedTask; // fully populated model
        }
    }
}

export const taskActionService = new TaskActionService();