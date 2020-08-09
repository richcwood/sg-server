import { convertData } from '../utils/ResponseConverters';
import { taskOutcomeService } from './TaskOutcomeService';
import { TaskSchema, TaskModel } from '../domain/Task';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { TaskOutcomeSchema, TaskOutcomeModel } from '../domain/TaskOutcome';
import { TaskStatus, TaskFailureCode } from '../../shared/Enums';
import { TaskDefTarget } from '../../shared/Enums';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import { BaseLogger } from '../../shared/SGLogger';
import * as config from 'config';
import { AMQPConnector } from '../../shared/AMQPLib';


let appName: string = 'JobService';
const amqpUrl = config.get('amqpUrl');
const rmqVhost = config.get('rmqVhost');
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();
let amqp: AMQPConnector = new AMQPConnector(appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => { }, logger);
amqp.Start();


export class TaskOutcomeActionService {

    public async interruptTaskOutcome(_orgId: mongodb.ObjectId, _taskOutcomeId: mongodb.ObjectId, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: _taskOutcomeId, _orgId, status: TaskStatus.RUNNING };
        const updatedTaskOutcome = await TaskOutcomeModel.findOneAndUpdate(filter, { status: TaskStatus.INTERRUPTING }, { new: true }).select('_id _orgId _jobId _agentId target sourceTaskRoute correlationId runtimeVars status');

        if (!updatedTaskOutcome)
            throw new ValidationError(`Task outcome ${_taskOutcomeId} not found with filter ${JSON.stringify(filter)}`);

        await rabbitMQPublisher.publish(_orgId, "TaskOutcome", correlationId, PayloadOperation.UPDATE, convertData(TaskOutcomeSchema, updatedTaskOutcome));

        await rabbitMQPublisher.publishToAgent(_orgId, updatedTaskOutcome._agentId, { interruptTask: convertData(TaskOutcomeSchema, updatedTaskOutcome) });

        if (responseFields) {
            return taskOutcomeService.findTaskOutcome(_orgId, _taskOutcomeId, responseFields);
        }
        else {
            return updatedTaskOutcome; // fully populated model
        }
    }


    public async restartTaskOutcome(_orgId: mongodb.ObjectId, _taskOutcomeId: mongodb.ObjectId, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: _taskOutcomeId, _orgId, $or: [ { status: TaskStatus.INTERRUPTED }, { $and: [ { status: TaskStatus.FAILED }, { $or: [ { failureCode: TaskFailureCode.AGENT_EXEC_ERROR }, { failureCode: TaskFailureCode.LAUNCH_TASK_ERROR }, { failureCode: TaskFailureCode.TASK_EXEC_ERROR } ] } ] } ] };
        let taskOutcomeUpdateQuery = {};
        taskOutcomeUpdateQuery['$unset'] = {'runtimeVars.route': ''};
        taskOutcomeUpdateQuery['$set'] = {'route': '', 'status': TaskStatus.CANCELLED};
        const updatedTaskOutcome = await TaskOutcomeModel.findOneAndUpdate(filter, taskOutcomeUpdateQuery, { new: true }).select('_id _agentId status _taskId runtimeVars');

        if (!updatedTaskOutcome)
            throw new ValidationError(`Task outcome ${_taskOutcomeId} not found with filter ${JSON.stringify(filter)}`);

        const deltas = { _id: updatedTaskOutcome._id, status: updatedTaskOutcome.status };
        await rabbitMQPublisher.publish(_orgId, "TaskOutcome", correlationId, PayloadOperation.UPDATE, convertData(TaskOutcomeSchema, deltas));

        const taskFilter = { _id: new mongodb.ObjectId(updatedTaskOutcome._taskId), _orgId };
        let taskUpdateQuery = {};
        taskUpdateQuery['$unset'] = {'runtimeVars.route': ''};
        taskUpdateQuery['$set'] = {'attemptedRunAgentIds': []};
        let task: TaskSchema = await TaskModel.findOneAndUpdate(taskFilter, taskUpdateQuery, { new: true });
        if (!task)
            throw new MissingObjectError(`Missing task ${updatedTaskOutcome._taskId} corresponding to task outcome ${_taskOutcomeId}`);

        task.runtimeVars = updatedTaskOutcome.runtimeVars;
        if (task.target & (TaskDefTarget.ALL_AGENTS|TaskDefTarget.ALL_AGENTS_WITH_TAGS)) {
            task.target = TaskDefTarget.SINGLE_SPECIFIC_AGENT;
            task.targetAgentId = updatedTaskOutcome._agentId;
        }

        await taskOutcomeService.PublishTask(_orgId, task, logger, amqp);
        
        if (responseFields) {
            return taskOutcomeService.findTaskOutcome(_orgId, _taskOutcomeId, responseFields);
        }
        else {
            return updatedTaskOutcome; // fully populated model
        }
    }

    public async cancelTaskOutcome(_orgId: mongodb.ObjectId, _taskOutcomeId: mongodb.ObjectId, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: _taskOutcomeId, _orgId, $or: [{ status: { $lt: TaskStatus.CANCELING } }, { status: TaskStatus.FAILED }] };
        const updatedTaskOutcome = await TaskOutcomeModel.findOneAndUpdate(filter, { status: TaskStatus.CANCELING }, { new: true }).select(responseFields);

        // TODO: if the task was already interrupted sending the cancel message to the agent won't do anything (i.e. the agent won't kill the process and send the 
        //      updates to the api) - how to handle both cases, i.e. where the task is currently running and where it needs to be interrupted? race conditions?
        if (!updatedTaskOutcome)
            throw new ValidationError(`Task outcome ${_taskOutcomeId} not found with filter ${JSON.stringify(filter)}`);

        await rabbitMQPublisher.publish(_orgId, "TaskOutcome", correlationId, PayloadOperation.UPDATE, convertData(TaskOutcomeSchema, updatedTaskOutcome));

        await rabbitMQPublisher.publishToAgent(_orgId, updatedTaskOutcome._agentId, { interruptTask: convertData(TaskOutcomeSchema, updatedTaskOutcome) });

        if (responseFields) {
            return taskOutcomeService.findTaskOutcome(_orgId, _taskOutcomeId, responseFields);
        }
        else {
            return updatedTaskOutcome; // fully populated model
        }
    }
}

export const taskOutcomeActionService = new TaskOutcomeActionService();