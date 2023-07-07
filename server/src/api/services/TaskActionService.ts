import * as config from 'config';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

import { TaskSchema, TaskModel } from '../domain/Task';

import { taskService } from '../services/TaskService';
import { taskOutcomeService } from '../services/TaskOutcomeService';

import { AMQPConnector } from '../../shared/AMQPLib';
import { TaskStatus, TaskFailureCode, TaskDefTarget } from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';
import { SGUtils } from '../../shared/SGUtils';
import { SGStrings } from '../../shared/SGStrings';

import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { convertData } from '../utils/ResponseConverters';
import { GetTaskRoutes, IGetTaskRouteResult } from '../utils/Shared';

export class TaskActionService {
    public async republishTask(
        _teamId: mongodb.ObjectId,
        _taskId: mongodb.ObjectId,
        logger: BaseLogger,
        amqp: AMQPConnector,
        correlationId?: string,
        responseFields?: string
    ): Promise<object> {
        const filter = { _id: _taskId, _teamId, status: { $lte: TaskStatus.PUBLISHED } };

        // let taskUpdateQuery = {};
        // taskUpdateQuery['$unset'] = { 'runtimeVars.route': '' };
        // taskUpdateQuery['$set'] = { 'status': null, 'failureCode': null };
        // let updatedTask: TaskSchema = await TaskModel.findOneAndUpdate(filter, taskUpdateQuery, { new: true });
        // if (!updatedTask) {
        //     logger.LogError(`Task ${_taskId} not found with filter ${JSON.stringify(filter)}`, {});
        //     return {};
        // }

        // await rabbitMQPublisher.publish(_teamId, "Task", correlationId, PayloadOperation.UPDATE, convertData(TaskSchema, updatedTask));

        // const tasks = await taskService.findAllJobTasks(_teamId, updatedTask._jobId, 'toRoutes');
        // const tasksToRoutes = SGUtils.flatMap(x => x, tasks.map((t) => SGUtils.flatMap(x => x[0], t.toRoutes)));
        // if ((!updatedTask.up_dep || (Object.keys(updatedTask.up_dep).length < 1)) && (tasksToRoutes.indexOf(updatedTask.name) < 0)) {
        //     if (updatedTask.status == null) {
        //         updatedTask.status = TaskStatus.NOT_STARTED;
        //         await taskService.updateTask(_teamId, updatedTask._id, { status: updatedTask.status }, logger, { status: null }, null, null);
        //         await taskOutcomeService.PublishTask(_teamId, updatedTask, logger, amqp);
        //     }
        // }

        try {
            let taskUpdateQuery = {};
            taskUpdateQuery['$unset'] = { 'runtimeVars.route': '' };
            taskUpdateQuery['$set'] = { status: TaskStatus.NOT_STARTED, failureCode: '' };

            let updatedTask: any = await taskService.updateTask(
                _teamId,
                _taskId,
                taskUpdateQuery,
                logger,
                filter,
                null,
                null
            );
            await taskOutcomeService.PublishTask(_teamId, updatedTask, logger, amqp);

            if (responseFields) {
                return taskService.findTask(_teamId, _taskId, responseFields);
            } else {
                return updatedTask; // fully populated model
            }
        } catch (err) {
            logger.LogError(`Error republishing task: ${err.message}`, {
                Class: 'TaskActionService',
                Method: 'republishTask',
                _taskId,
            });
            return { success: false };
        }
    }

    public async requeueTask(
        _teamId: mongodb.ObjectId,
        _taskId: mongodb.ObjectId,
        data: any,
        logger: BaseLogger,
        amqp: AMQPConnector,
        correlationId?: string,
        responseFields?: string
    ): Promise<object> {
        const filter = { _id: _taskId, _teamId, status: TaskStatus.PUBLISHED };

        let taskUpdateQuery = {};
        taskUpdateQuery['$unset'] = { 'runtimeVars.route': '' };
        taskUpdateQuery['$set'] = { route: '', status: null, failureCode: null };
        let updatedTask: any = await TaskModel.findOneAndUpdate(filter, taskUpdateQuery, { new: true });
        if (!updatedTask) return {};

        const task: any = data.task;
        const queue: string = data.queue;

        let agentId;
        const agentIdMatch = /(?<=agent-)([A-Za-z0-9]*)/g;
        let arrParams: string[] = queue.match(agentIdMatch);
        if (_.isArray(arrParams) && arrParams.length > 0) agentId = new mongodb.ObjectId(arrParams[0]);

        const routeTaskInfo: any = {
            target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
            targetAgentId: agentId,
            _jobId: task._jobId,
        };

        let _teamIdAgent: mongodb.ObjectId = _teamId;
        const sgAdminTeam = new mongodb.ObjectId(process.env.sgAdminTeam);
        if (task.target == TaskDefTarget.AWS_LAMBDA) _teamIdAgent = sgAdminTeam;

        let getTaskRoutesRes: IGetTaskRouteResult = await GetTaskRoutes(_teamIdAgent, routeTaskInfo, logger);
        if (!getTaskRoutesRes.routes) {
            let deltas: any;
            let taskFailed: boolean = false;
            if (getTaskRoutesRes.failureCode == TaskFailureCode.TARGET_AGENT_NOT_SPECIFIED) {
                taskFailed = true;
                deltas = { status: TaskStatus.FAILED, failureCode: getTaskRoutesRes.failureCode, route: 'fail' };
                updatedTask = await taskService.updateTask(_teamId, _taskId, deltas, logger);
            } else if (getTaskRoutesRes.failureCode == TaskFailureCode.NO_AGENT_AVAILABLE) {
                deltas = {
                    status: TaskStatus.WAITING_FOR_AGENT,
                    failureCode: getTaskRoutesRes.failureCode,
                    route: 'fail',
                };
                updatedTask = await taskService.updateTask(_teamId, _taskId, deltas, logger);
            } else {
                taskFailed = true;
                deltas = { status: TaskStatus.FAILED, failureCode: getTaskRoutesRes.failureCode, route: 'fail' };
                updatedTask = await taskService.updateTask(_teamId, _taskId, deltas, logger);
                logger.LogError(`Unhandled failure code: ${getTaskRoutesRes.failureCode}`, {
                    Class: 'TaskOutcomeService',
                    Method: 'requeueTask',
                    _teamId,
                    task: task,
                });
            }

            if (taskFailed) {
                await SGUtils.OnTaskFailed(_teamId, task, TaskFailureCode[getTaskRoutesRes.failureCode], logger);
            }
        } else {
            const routes = getTaskRoutesRes.routes;
            let ttl = config.get('defaultQueuedTaskTTL');

            for (let i = 0; i < routes.length; i++) {
                if (routes[i]['type'] == 'queue') {
                    await amqp.PublishQueue(
                        SGStrings.GetTeamExchangeName(_teamId.toHexString()),
                        routes[i]['route'],
                        task,
                        routes[i]['queueAssertArgs'],
                        { expiration: ttl }
                    );
                } else {
                    // This would be used for tasks not targeting specific agents - we do not currently route any tasks this way
                    await amqp.PublishRoute(
                        SGStrings.GetTeamExchangeName(_teamId.toHexString()),
                        routes[i]['route'],
                        task
                    );
                }
            }

            updatedTask = await taskService.updateTask(
                _teamId,
                _taskId,
                { status: TaskStatus.PUBLISHED, failureCode: '' },
                logger
            );
        }

        await rabbitMQPublisher.publish(
            _teamId,
            'Task',
            correlationId,
            PayloadOperation.UPDATE,
            convertData(TaskSchema, updatedTask)
        );

        if (responseFields) {
            return taskService.findTask(_teamId, _taskId, responseFields);
        } else {
            return updatedTask; // fully populated model
        }
    }
}

export const taskActionService = new TaskActionService();
