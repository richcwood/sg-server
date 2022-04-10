import { convertData } from "../utils/ResponseConverters";
import { TaskSchema, TaskModel } from "../domain/Task";
import { rabbitMQPublisher, PayloadOperation } from "../utils/RabbitMQPublisher";
import { BaseLogger } from "../../shared/SGLogger";
import { MissingObjectError, ValidationError } from "../utils/Errors";
import * as mongodb from "mongodb";
import * as _ from "lodash";

export class TaskService {
  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllTasksInternal(filter?: any, responseFields?: string, limit: number = 100) {
    return TaskModel.find(filter).select(responseFields).limit(limit);
  }

  public async findTasks(_teamId: mongodb.ObjectId, filter: any, responseFields?: string) {
    filter = Object.assign({ _teamId }, filter);
    return TaskModel.find(filter).select(responseFields);
  }

  public async findAllJobTasks(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, responseFields?: string) {
    return TaskModel.find({ _teamId, _jobId }).select(responseFields);
  }

  public async findTask(_teamId: mongodb.ObjectId, taskId: mongodb.ObjectId, responseFields?: string) {
    return TaskModel.findById(taskId).find({ _teamId }).select(responseFields);
  }

  public async findTaskByName(
    _teamId: mongodb.ObjectId,
    _jobId: mongodb.ObjectId,
    taskName: string,
    responseFields?: string
  ): Promise<TaskSchema | null> {
    const result: TaskSchema[] = await TaskModel.find({ _teamId, _jobId, name: taskName }).select(responseFields);
    if (_.isArray(result) && result.length > 0) return result[0];
    return null;
  }

  public async deleteTask(
    _teamId: mongodb.ObjectId,
    _jobId: mongodb.ObjectId,
    correlationId?: string
  ): Promise<object> {
    const filter = { _jobId, _teamId };

    let res: any = { ok: 1, deletedCount: 0 };

    const tasksQuery = await TaskModel.find(filter).select("id");
    if (_.isArray(tasksQuery) && tasksQuery.length === 0) {
      res.n = 0;
    } else {
      res.n = tasksQuery.length;
      for (let i = 0; i < tasksQuery.length; i++) {
        const task: any = tasksQuery[i];
        let deleted = await TaskModel.deleteOne({ _id: task._id });
        if (deleted.acknowledged) {
          res.deletedCount += deleted.deletedCount;
          await rabbitMQPublisher.publish(_teamId, "Task", correlationId, PayloadOperation.DELETE, { id: task._id });
        }
      }
    }

    return res;
  }

  public async createTaskInternal(data: any): Promise<object> {
    const model = new TaskModel(data);
    await model.save();
    return;
  }

  public async createTask(
    _teamId: mongodb.ObjectId,
    data: any,
    correlationId?: string,
    responseFields?: string
  ): Promise<object> {
    data._teamId = _teamId;
    const taskModel = new TaskModel(data);
    const newTask = await taskModel.save();

    await rabbitMQPublisher.publish(
      _teamId,
      "Task",
      correlationId,
      PayloadOperation.CREATE,
      convertData(TaskSchema, newTask)
    );

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findTask(_teamId, newTask._id, responseFields);
    } else {
      return newTask; // fully populated model
    }
  }

  public async updateTask(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    data: any,
    logger: BaseLogger,
    filter?: any,
    correlationId?: string,
    responseFields?: string
  ): Promise<object> {
    // logger.LogDebug('TaskService -> updateTask ->', {
    //     'id': id,
    //     'data': JSON.stringify(data, null, 4),
    //     'filter': JSON.stringify(filter, null, 4)
    // });

    const defaultFilter = { _id: id, _teamId };
    if (filter) filter = Object.assign(defaultFilter, filter);
    else filter = defaultFilter;

    const task: TaskSchema = await TaskModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);
    // console.log('TaskService -> updateTask -> task -> ', JSON.stringify(task, null, 4));
    if (!task) throw new MissingObjectError(`Task "${id}" not found with filter "${JSON.stringify(filter)}"`);

    // if (task.status == TaskStatus.FAILED && task.failureCode == TaskFailureCode.QUEUED_TASK_EXPIRED && task.target == TaskDefTarget.SINGLE_AGENT_WITH_TAGS) {
    //     await taskActionService.republishFailedTask(_teamId, task._id, correlationId, responseFields);
    // } else if (task.status == TaskStatus.FAILED){
    //     let taskOutcome: any = {
    //         _teamId: task._teamId,
    //         _jobId: task._jobId,
    //         _taskId: task._id,
    //         sourceTaskRoute: task.sourceTaskRoute,
    //         correlationId: task.correlationId,
    //         dateStarted: new Date().toISOString(),
    //         ipAddress: '',
    //         machineId: '',
    //         artifactsDownloadedSize: 0,
    //         target: task.target,
    //         runtimeVars: task.runtimeVars
    //     }
    //     taskOutcome = await taskOutcomeService.createTaskOutcome(_teamId, taskOutcome, logger);
    //     taskOutcome.status = TaskStatus.FAILED;
    //     taskOutcome.failureCode = task.failureCode
    //     taskOutcome = await taskOutcomeService.updateTaskOutcome(_teamId, taskOutcome._id, taskOutcome, logger);
    // }

    const deltas = Object.assign({ _id: id }, data);
    await rabbitMQPublisher.publish(
      _teamId,
      "Task",
      correlationId,
      PayloadOperation.UPDATE,
      convertData(TaskSchema, deltas)
    );

    return task;
  }
}

export const taskService = new TaskService();
