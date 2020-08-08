import { convertData } from '../utils/ResponseConverters';
import { TaskDefSchema, TaskDefModel } from '../domain/TaskDef';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { KikiUtils } from '../../shared/KikiUtils';
import * as Enums from '../../shared/Enums';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class TaskDefService {

  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllTaskDefsInternal(filter?: any, responseFields?: string) {
    return TaskDefModel.find(filter).select(responseFields);
  }


  public async findTaskDefs(_orgId: mongodb.ObjectId, filter: any, responseFields?: string) {
    filter = Object.assign({ _orgId }, filter);
    return TaskDefModel.find(filter).select(responseFields);
  }


  public async findJobDefTaskDefs(_orgId: mongodb.ObjectId, _jobDefId: mongodb.ObjectId, responseFields?: string) {
    return TaskDefModel.find({ _jobDefId, _orgId }).select(responseFields);
  }


  public async findTaskDef(_orgId: mongodb.ObjectId, taskDefId: mongodb.ObjectId, responseFields?: string) {
    return TaskDefModel.findById(taskDefId).find({ _orgId }).select(responseFields);
  }


  public async findTaskDefByName(_orgId: mongodb.ObjectId, _jobDefId: mongodb.ObjectId, taskDefName: string, responseFields?: string) {
    let taskDef = await TaskDefModel.find({ _orgId, _jobDefId, name: taskDefName }).select(responseFields);
    return convertData(TaskDefSchema, taskDef);
  }


  public async createTaskDefInternal(data: any): Promise<object> {
    const model = new TaskDefModel(data);
    const newTaskDef = await model.save();
    return newTaskDef;
  }


  public async createTaskDef(_orgId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
    if (!data.name)
      throw new ValidationError(`Request body missing "name" parameter`);
    if (!data._jobDefId)
      throw new ValidationError(`Request body missing "_jobDefId" parameter`);


    let taskDefs: TaskDefSchema[] = await this.findJobDefTaskDefs(_orgId, data._jobDefId, 'name fromRoutes');
    for (let i = 0; i < taskDefs.length; i++) {
      let taskDef: TaskDefSchema = taskDefs[i];
      if (taskDef.name == data.name)
        throw new ValidationError(`Job template "${data._jobDefId}" already contains a task with name "${data.name}"`);
    }

    taskDefs.push(data);
    let cd = KikiUtils.isJobDefCyclical(taskDefs);
    if (Object.keys(cd).length > 0)
      throw new ValidationError(`New task would create cyclic dependency with the following tasks: ${Object.keys(cd).filter((key) => cd[key])}`)

    data._orgId = _orgId;
    const taskDefModel = new TaskDefModel(data);
    const newTaskDef = await taskDefModel.save();

    await rabbitMQPublisher.publish(_orgId, "TaskDef", correlationId, PayloadOperation.CREATE, convertData(TaskDefSchema, newTaskDef));

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return this.findTaskDef(_orgId, newTaskDef._id, responseFields);
    }
    else {
      return newTaskDef; // fully populated model
    }
  }


  public async updateTaskDef(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
    if ('fromRoutes' in data || 'toRoutes' in data) {
      const taskDefQuery = await TaskDefModel.findById(id).find({ _orgId }).select('_jobDefId');
      if (!taskDefQuery || (_.isArray(taskDefQuery) && taskDefQuery.length === 0))
        throw new MissingObjectError(`No TaskDef with id "${id.toHexString()}"`);
      const taskDef: TaskDefSchema = taskDefQuery[0];

      let taskDefs: TaskDefSchema[] = await TaskDefModel.find({ _jobDefId: taskDef._jobDefId, _orgId }).select(responseFields).lean();
      for (let i = 0; i < taskDefs.length; i++) {
        if (taskDefs[i]._id.toHexString() == id.toHexString()) {
          taskDefs[i].toRoutes = data.toRoutes;
          taskDefs[i].fromRoutes = data.fromRoutes;
        }
      }

      Object.assign(taskDef, data);
      if (taskDef.target & (Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)) {
        if (!(_.isPlainObject(taskDef.requiredTags)) || (Object.keys(taskDef.requiredTags).length === 0)) {
          if (_.isPlainObject(taskDef.requiredTags))
            throw new ValidationError(`Task "${taskDef.name}" target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but no required tags are specified`);
          else
            throw new ValidationError(`Task "${taskDef.name}" target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but required tags are incorrectly formatted`);
        }
      }

      if (taskDef.autoRestart && (taskDef.target & (Enums.TaskDefTarget.ALL_AGENTS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS))) {
        throw new ValidationError(`Task "${taskDef.name}" has autoRestart=true but target is "ALL_AGENTS" or "ALL_AGENTS_WITH_TAGS" - autoRestart tasks must target any single agent, a specific agent or a single agent with required tags`);
      }

      let cd = KikiUtils.isJobDefCyclical(taskDefs);
      if (Object.keys(cd).length > 0)
        throw new ValidationError(`Task update would create a cyclic dependency with the following tasks: ${Object.keys(cd).filter((key) => cd[key])}`)
    }

    const filter = { _id: id, _orgId };
    const updatedTaskDef = await TaskDefModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

    if (!updatedTaskDef)
      throw new MissingObjectError(`TaskDef '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

    const deltas = Object.assign({ _id: id }, data);
    await rabbitMQPublisher.publish(_orgId, "TaskDef", correlationId, PayloadOperation.UPDATE, convertData(TaskDefSchema, deltas));

    return updatedTaskDef; // fully populated model
  }


  public async deleteTaskDef(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId?: string): Promise<void> {
    /// Delete outbound routes to this task
    const taskDefQuery = await TaskDefModel.findById(id).find({ _orgId }).select('_jobDefId name');
    if (!taskDefQuery || (_.isArray(taskDefQuery) && taskDefQuery.length === 0))
      throw new MissingObjectError(`No TaskDef with id "${id.toHexString()}"`);
    const taskDef: TaskDefSchema = taskDefQuery[0];

    let taskDefs: TaskDefSchema[] = await this.findJobDefTaskDefs(_orgId, taskDef._jobDefId, 'name toRoutes fromRoutes');
    for (let i = 0; i < taskDefs.length; i++) {
      let taskDefToCheck: TaskDefSchema = taskDefs[i];
      if (taskDefToCheck.toRoutes) {
        let newToRoutes: any[] = [];
        let updateToRoutes: boolean = false;
        for (let j = 0; j < taskDefToCheck.toRoutes.length; j++) {
          if (taskDefToCheck.toRoutes[j][0] == taskDef.name) {
            updateToRoutes = true;
          } else {
            newToRoutes.push(_.clone(taskDefToCheck.toRoutes[j]));
          }
        }
        if (updateToRoutes)
          await this.updateTaskDef(_orgId, taskDefToCheck._id, { toRoutes: newToRoutes });
      }
      if (taskDefToCheck.fromRoutes) {
        let newFromRoutes: any[] = [];
        let updateFromRoutes: boolean = false;
        for (let j = 0; j < taskDefToCheck.fromRoutes.length; j++) {
          if (taskDefToCheck.fromRoutes[j][0] == taskDef.name) {
            updateFromRoutes = true;
          } else {
            newFromRoutes.push(_.clone(taskDefToCheck.fromRoutes[j]));
          }
        }
        if (updateFromRoutes)
          await this.updateTaskDef(_orgId, taskDefToCheck._id, { fromRoutes: newFromRoutes });
      }
    }

    const deleted = await TaskDefModel.deleteOne({ _id: id });

    await rabbitMQPublisher.publish(_orgId, "TaskDef", correlationId, PayloadOperation.DELETE, { id, correlationId });

    return deleted;
  }
}

export const taskDefService = new TaskDefService();