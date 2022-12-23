import {convertData} from "../utils/ResponseConverters";
import {TaskDefSchema, TaskDefModel} from "../domain/TaskDef";
import {StepDefSchema, StepDefModel} from "../domain/StepDef";
import {rabbitMQPublisher, PayloadOperation} from "../utils/RabbitMQPublisher";
import {MissingObjectError, ValidationError} from "../utils/Errors";
import {SGUtils} from "../../shared/SGUtils";
import * as Enums from "../../shared/Enums";
import * as mongodb from "mongodb";
import * as _ from "lodash";
import {stepDefService} from "./StepDefService";

export class TaskDefService {
  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllTaskDefsInternal(filter?: any, responseFields?: string): Promise<Array<TaskDefSchema>> {
    return TaskDefModel.find(filter).select(responseFields);
  }

  public async findTaskDefs(_teamId: mongodb.ObjectId, filter: any, responseFields?: string) {
    filter = Object.assign({_teamId}, filter);
    return TaskDefModel.find(filter).select(responseFields);
  }

  public async findJobDefTaskDefs(
    _teamId: mongodb.ObjectId,
    _jobDefId: mongodb.ObjectId,
    responseFields?: string
  ): Promise<TaskDefSchema[] | null> {
    return await TaskDefModel.find({_jobDefId, _teamId}).select(responseFields);
  }

  public async findTaskDef(
    _teamId: mongodb.ObjectId,
    taskDefId: mongodb.ObjectId,
    responseFields?: string
  ): Promise<TaskDefSchema | null> {
    const result: TaskDefSchema[] = await TaskDefModel.findById(taskDefId).find({_teamId}).select(responseFields);
    if (_.isArray(result) && result.length > 0) return result[0];
    return null;
  }

  public async findTaskDefByName(
    _teamId: mongodb.ObjectId,
    _jobDefId: mongodb.ObjectId,
    taskDefName: string,
    responseFields?: string
  ) {
    let taskDef = await TaskDefModel.find({_teamId, _jobDefId, name: taskDefName}).select(responseFields);
    return convertData(TaskDefSchema, taskDef);
  }

  public async createTaskDefInternal(data: any): Promise<object> {
    const model = new TaskDefModel(data);
    const newTaskDef = await model.save();
    return newTaskDef;
  }

  public async createTaskDef(
    _teamId: mongodb.ObjectId,
    data: any,
    correlationId: string,
    responseFields?: string
  ): Promise<TaskDefSchema> {
    if (!data.name) throw new ValidationError(`Request body missing "name" parameter`);
    if (!data._jobDefId) throw new ValidationError(`Request body missing "_jobDefId" parameter`);

    let taskDefs: TaskDefSchema[] = await this.findJobDefTaskDefs(_teamId, data._jobDefId, "name fromRoutes");
    for (let i = 0; i < taskDefs.length; i++) {
      let taskDef: TaskDefSchema = taskDefs[i];
      if (taskDef.name == data.name)
        throw new ValidationError(`Job template "${data._jobDefId}" already contains a task with name "${data.name}"`);
    }

    taskDefs.push(data);
    let cd = SGUtils.isJobDefCyclical(taskDefs);
    if (Object.keys(cd).length > 0)
      throw new ValidationError(
        `New task would create cyclic dependency with the following tasks: ${Object.keys(cd).filter((key) => cd[key])}`
      );

    data._teamId = _teamId;
    const taskDefModel = new TaskDefModel(data);
    const newTaskDef = await taskDefModel.save();

    await rabbitMQPublisher.publish(
      _teamId,
      "TaskDef",
      correlationId,
      PayloadOperation.CREATE,
      convertData(TaskDefSchema, newTaskDef)
    );

    if (newTaskDef.target == Enums.TaskDefTarget.AWS_LAMBDA) {
      const newLambdaStep: StepDefSchema = {
        _teamId,
        _taskDefId: newTaskDef._id,
        _scriptId: null,
        name: "AwsLambda",
        order: 1,
        arguments: "",
        variables: new Map([]),
        lambdaCodeSource: "script",
        lambdaMemorySize: 128,
        lambdaTimeout: 3,
        lambdaFunctionHandler: "",
        lambdaDependencies: "",
        lambdaRuntime: ".NET Core 3.1 (C#/PowerShell)",
      };
      await stepDefService.createStepDef(_teamId, newLambdaStep, correlationId, "id");
    }

    if (responseFields) {
      // It's is a bit wasteful to do another query but I can't chain a save with a select
      return await this.findTaskDef(_teamId, newTaskDef._id, responseFields);
    } else {
      return newTaskDef; // fully populated model
    }
  }

  public async updateTaskDef(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    data: any,
    correlationId?: string,
    responseFields?: string
  ): Promise<object> {
    if ("fromRoutes" in data || "toRoutes" in data || "name" in data) {
      let toRoutes_updated = [];
      if (data.toRoutes && _.isArray(data.toRoutes)) toRoutes_updated = data.toRoutes;
      let fromRoutes_updated = [];
      if (data.fromRoutes && _.isArray(data.fromRoutes)) fromRoutes_updated = data.fromRoutes;

      const taskDefQuery = await TaskDefModel.findById(id).find({_teamId}).select("_jobDefId name");
      if (!taskDefQuery || (_.isArray(taskDefQuery) && taskDefQuery.length === 0))
        throw new MissingObjectError(`No TaskDef with id "${id.toHexString()}"`);
      const taskDef: TaskDefSchema = taskDefQuery[0];

      let taskDefs: TaskDefSchema[] = await TaskDefModel.find({_jobDefId: taskDef._jobDefId, _teamId})
        .select("toRoutes fromRoutes name")
        .lean();
      for (let i = 0; i < taskDefs.length; i++) {
        if (taskDefs[i]._id.toHexString() == id.toHexString()) {
          taskDefs[i].toRoutes = toRoutes_updated;
          taskDefs[i].fromRoutes = fromRoutes_updated;
        }
      }

      const taskName_original = taskDef.name;
      Object.assign(taskDef, data);
      if (taskDef.target & (Enums.TaskDefTarget.SINGLE_AGENT_WITH_TAGS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)) {
        if (!_.isPlainObject(taskDef.requiredTags) || Object.keys(taskDef.requiredTags).length === 0) {
          if (_.isPlainObject(taskDef.requiredTags))
            throw new ValidationError(
              `Task "${taskDef.name}" target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but no required tags are specified`
            );
          else
            throw new ValidationError(
              `Task "${taskDef.name}" target is "SINGLE_AGENT_WITH_TAGS" or "ALL_AGENTS_WITH_TAGS" but required tags are incorrectly formatted`
            );
        }
      }

      if (
        taskDef.autoRestart &&
        taskDef.target & (Enums.TaskDefTarget.ALL_AGENTS | Enums.TaskDefTarget.ALL_AGENTS_WITH_TAGS)
      ) {
        throw new ValidationError(
          `Task "${taskDef.name}" has autoRestart=true but target is "ALL_AGENTS" or "ALL_AGENTS_WITH_TAGS" - autoRestart tasks must target any single agent, a specific agent or a single agent with required tags`
        );
      }

      // Update routes for all tasks in the job that reference this task (by name)
      let name_updated = taskName_original;
      if (data.name) name_updated = data.name;
      if (name_updated != taskName_original) {
        for (let i = 0; i < taskDefs.length; i++) {
          let needToUpdate = false;
          let fromRoutes_updated = [];
          let toRoutes_updated = [];
          for (let j = 0; j < taskDefs[i].fromRoutes.length; ++j) {
            const route = taskDefs[i].fromRoutes[j];
            if (route[0] == taskName_original) {
              needToUpdate = true;
              fromRoutes_updated.push([name_updated, route[1]]);
            } else {
              fromRoutes_updated.push(route);
            }
          }
          for (let j = 0; j < taskDefs[i].toRoutes.length; ++j) {
            const route = taskDefs[i].toRoutes[j];
            if (route[0] == taskName_original) {
              needToUpdate = true;
              toRoutes_updated.push([name_updated, route[1]]);
            } else {
              toRoutes_updated.push(route);
            }
          }
          if (needToUpdate) {
            const taskRoutesUpdate = {fromRoutes: fromRoutes_updated, toRoutes: toRoutes_updated};
            await TaskDefModel.findOneAndUpdate({_id: taskDefs[i]._id}, taskRoutesUpdate, {new: true}).select(
              responseFields
            );
            const taskRoutesDeltas = Object.assign({_id: taskDefs[i]._id}, taskRoutesUpdate);
            await rabbitMQPublisher.publish(
              _teamId,
              "TaskDef",
              correlationId,
              PayloadOperation.UPDATE,
              convertData(TaskDefSchema, taskRoutesDeltas)
            );
          }
        }
      }

      let cd = SGUtils.isJobDefCyclical(taskDefs);
      if (Object.keys(cd).length > 0)
        throw new ValidationError(
          `Task update would create a cyclic dependency with the following tasks: ${Object.keys(cd).filter(
            (key) => cd[key]
          )}`
        );
    }

    const filter = {_id: id, _teamId};
    const updatedTaskDef = await TaskDefModel.findOneAndUpdate(filter, data, {new: true}).select(responseFields);

    if (!updatedTaskDef)
      throw new MissingObjectError(`TaskDef '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`);

    const deltas = Object.assign({_id: id}, data);
    await rabbitMQPublisher.publish(
      _teamId,
      "TaskDef",
      correlationId,
      PayloadOperation.UPDATE,
      convertData(TaskDefSchema, deltas)
    );

    return updatedTaskDef; // fully populated model
  }

  public async deleteTaskDef(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId?: string): Promise<object> {
    /// Delete outbound routes to this task
    const taskDefQuery = await TaskDefModel.findById(id).find({_teamId}).select("_jobDefId name");
    if (!taskDefQuery || (_.isArray(taskDefQuery) && taskDefQuery.length === 0))
      throw new MissingObjectError(`No TaskDef with id "${id.toHexString()}"`);
    const taskDef: TaskDefSchema = taskDefQuery[0];

    let taskDefs: TaskDefSchema[] = await this.findJobDefTaskDefs(
      _teamId,
      taskDef._jobDefId,
      "name toRoutes fromRoutes"
    );
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
        if (updateToRoutes) await this.updateTaskDef(_teamId, taskDefToCheck._id, {toRoutes: newToRoutes});
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
        if (updateFromRoutes) await this.updateTaskDef(_teamId, taskDefToCheck._id, {fromRoutes: newFromRoutes});
      }
    }

    const deleted = await TaskDefModel.deleteOne({_id: id});

    await rabbitMQPublisher.publish(_teamId, "TaskDef", correlationId, PayloadOperation.DELETE, {id, correlationId});

    return deleted;
  }
}

export const taskDefService = new TaskDefService();
