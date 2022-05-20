import { JobSchema, JobModel } from "../domain/Job";
import { StepSchema } from "../domain/Step";
import { StepOutcomeModel } from "../domain/StepOutcome";
import { TaskSchema, TaskModel } from "../domain/Task";
import { TaskOutcomeSchema, TaskOutcomeModel } from "../domain/TaskOutcome";

import { jobDefService } from "./JobDefService";
import { jobService } from "./JobService";
import { stepOutcomeService } from "./StepOutcomeService";
import { stepService } from "./StepService";
import { taskOutcomeActionService } from "./TaskOutcomeActionService";
import { taskService } from "./TaskService";
import { teamVariableService } from "./TeamVariableService";

import { MissingObjectError, ValidationError } from "../utils/Errors";
import { rabbitMQPublisher, PayloadOperation } from "../utils/RabbitMQPublisher";
import { convertData } from "../utils/ResponseConverters";

import { AMQPConnector } from "../../shared/AMQPLib";
import { JobStatus, JobDefStatus, StepStatus, TaskDefTarget, TaskFailureCode, TaskStatus } from "../../shared/Enums";
import { FreeTierChecks } from "../../shared/FreeTierChecks";
import { BaseLogger } from "../../shared/SGLogger";
import { SGStrings } from "../../shared/SGStrings";
import { SGUtils } from "../../shared/SGUtils";

import { localRestAccess } from "../utils/LocalRestAccess";
import { GetTargetAgentId, GetTaskRoutes, IGetTaskRouteResult, RepublishTasksWaitingForAgent } from "../utils/Shared";

import * as config from "config";
import * as mongodb from "mongodb";
import * as _ from "lodash";

export class TaskOutcomeService {
  public async findAllTaskOutcomesInternal(filter?: any, responseFields?: string) {
    return TaskOutcomeModel.find(filter).select(responseFields);
  }

  public async findTaskOutcomes(_teamId: mongodb.ObjectId, filter: any, responseFields?: string) {
    filter = Object.assign({ _teamId }, filter);
    return TaskOutcomeModel.find(filter).select(responseFields);
  }

  public async findTaskOutcome(
    _teamId: mongodb.ObjectId,
    taskOutcomeId: mongodb.ObjectId,
    responseFields?: string
  ): Promise<TaskOutcomeSchema | null> {
    const result: TaskOutcomeSchema[] = await TaskOutcomeModel.findById(taskOutcomeId)
      .find({ _teamId })
      .select(responseFields);
    if (_.isArray(result) && result.length > 0) return result[0];
    return null;
  }

  public async deleteTaskOutcome(
    _teamId: mongodb.ObjectId,
    _jobId: mongodb.ObjectId,
    correlationId?: string
  ): Promise<object> {
    const filter = { _jobId, _teamId };

    let res: any = { ok: 1, deletedCount: 0 };

    const taskOutcomesQuery = await TaskOutcomeModel.find(filter).select("id");
    if (_.isArray(taskOutcomesQuery) && taskOutcomesQuery.length === 0) {
      res.n = 0;
    } else {
      res.n = taskOutcomesQuery.length;
      for (let i = 0; i < taskOutcomesQuery.length; i++) {
        const taskOutcome: any = taskOutcomesQuery[i];
        let deleted = await TaskOutcomeModel.deleteOne({ _id: taskOutcome._id });
        if (deleted.acknowledged) {
          res.deletedCount += deleted.deletedCount;
          await rabbitMQPublisher.publish(_teamId, "TaskOutcome", correlationId, PayloadOperation.DELETE, {
            id: taskOutcome._id,
          });
        }
      }
    }

    return res;
  }

  public async createTaskOutcomeInternal(data: any): Promise<object> {
    const model = new TaskOutcomeModel(data);
    await model.save();
    return;
  }

  public async createTaskOutcome(
    _teamId: mongodb.ObjectId,
    data: any,
    logger: BaseLogger,
    correlationId?: string,
    responseFields?: string
  ): Promise<object> {
    data._teamId = _teamId;
    const taskOutcomeModel = new TaskOutcomeModel(data);
    let newTaskOutcome: TaskOutcomeSchema = await taskOutcomeModel.save();

    await rabbitMQPublisher.publish(
      _teamId,
      "TaskOutcome",
      correlationId,
      PayloadOperation.CREATE,
      convertData(TaskOutcomeSchema, newTaskOutcome)
    );

    // if (newTaskOutcome.status >= TaskStatus.SUCCEEDED || newTaskOutcome.status == TaskStatus.INTERRUPTED) {
    //     await this.updateTaskOutcome(_teamId, newTaskOutcome._id, newTaskOutcome, logger);
    // }

    const taskQuery: TaskSchema[] = await taskService.findTask(_teamId, newTaskOutcome._taskId, "_id status");
    if (_.isArray(taskQuery) && taskQuery.length > 0) {
      if (taskQuery[0].status == TaskStatus.INTERRUPTED) {
        newTaskOutcome = await taskOutcomeActionService.interruptTaskOutcome(_teamId, newTaskOutcome._id);
      } else if (taskQuery[0].status == TaskStatus.CANCELLED) {
        newTaskOutcome = await taskOutcomeActionService.cancelTaskOutcome(_teamId, newTaskOutcome._id);
      }
    }

    await jobService.UpdateJobStatus(_teamId, newTaskOutcome._jobId, logger, null);

    if (responseFields) {
      return this.findTaskOutcome(_teamId, newTaskOutcome._id, responseFields);
    } else {
      return newTaskOutcome; // fully populated model
    }
  }

  public async updateTaskOutcome(
    _teamId: mongodb.ObjectId,
    id: mongodb.ObjectId,
    data: any,
    logger: BaseLogger,
    amqp: AMQPConnector,
    filter?: any,
    correlationId?: string,
    responseFields?: string
  ): Promise<object> {
    try {
      const currentTaskOutcome: TaskOutcomeSchema = await this.findTaskOutcome(_teamId, id, "status");
      // console.log('TaskOutcomeService -> updateTaskOutcome -> currentTaskOutcome -> ', JSON.stringify(currentTaskOutcomeQuery, null, 4));
      if (!currentTaskOutcome) throw new MissingObjectError(`TaskOutcome "${id}" not found for team "${_teamId}"`);
      if (data.status && data.status != currentTaskOutcome.status && currentTaskOutcome.status >= TaskStatus.SUCCEEDED)
        if (data.status != TaskStatus.INTERRUPTED || currentTaskOutcome.status != TaskStatus.CANCELLED)
          throw new ValidationError(
            `Cannot update TaskOutcome '${id}" status to ${data.status} - already completed with status "${
              TaskStatus[currentTaskOutcome.status]
            }'`
          );

      const defaultFilter = { _id: id, _teamId };
      if (filter) filter = Object.assign(defaultFilter, filter);
      else filter = defaultFilter;

      if (data.runtimeVars && data.runtimeVars.route) data.route = data.runtimeVars.route.value;
      let updatedTaskOutcome: TaskOutcomeSchema = await TaskOutcomeModel.findOneAndUpdate(filter, data, { new: true });
      if (!updatedTaskOutcome)
        throw new MissingObjectError(`TaskOutcome not found with filter "${JSON.stringify(filter, null, 4)}"`);

      if (data.status && data.status != currentTaskOutcome.status) {
        if (data.status >= TaskStatus.SUCCEEDED || data.status == TaskStatus.INTERRUPTED) {
          if (updatedTaskOutcome.runtimeVars) {
            for (let i = 0; i < Object.keys(updatedTaskOutcome.runtimeVars).length; i++) {
              let key = Object.keys(updatedTaskOutcome.runtimeVars)[i];
              if (key != SGStrings.route) {
                const val = updatedTaskOutcome.runtimeVars[key].value;
                const sensitive = updatedTaskOutcome.runtimeVars[key].sensitive;
                const qryUpdate: any = {};
                qryUpdate[`runtimeVars.${key}.value`] = val;
                qryUpdate[`runtimeVars.${key}.sensitive`] = sensitive;

                const resJobQuery = await jobService.updateJob(
                  _teamId,
                  updatedTaskOutcome._jobId,
                  qryUpdate,
                  logger,
                  amqp
                );
                if (!resJobQuery)
                  throw new MissingObjectError(`Job '${updatedTaskOutcome._jobId}" not found for team "${_teamId}"`);
              }
            }

            const resTaskQuery = await taskService.updateTask(
              _teamId,
              updatedTaskOutcome._taskId,
              { runtimeVars: updatedTaskOutcome.runtimeVars },
              logger
            );
            if (!resTaskQuery)
              throw new MissingObjectError(`Tasl '${updatedTaskOutcome._taskId}" not found for team "${_teamId}"`);
          }
        }

        /// When a task is interrupted, make sure the task steps are INTERRUPTED as well
        if (data.status == TaskStatus.INTERRUPTED && currentTaskOutcome.status == TaskStatus.INTERRUPTING) {
          const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(_teamId, id, null, "_id");
          if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
            for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
              const stepOutcome: any = taskStepOutcomesQuery[i];
              let stepOutcomeUpdate: any = {};
              stepOutcomeUpdate["status"] = StepStatus.INTERRUPTED;
              stepOutcomeUpdate["runtimeVars"] = { route: { value: "interrupt" } };
              await StepOutcomeModel.findOneAndUpdate(
                { _id: stepOutcome._id, _teamId, status: { $lt: StepStatus.INTERRUPTED } },
                stepOutcomeUpdate
              );
              // await stepOutcomeService.updateStepOutcome(_teamId, stepOutcome._id, stepOutcomeUpdate, null, { status: { $lt: StepStatus.INTERRUPTED } }, null, '_id');
            }
          }
        }

        /// Handles the case where a user canceled a running task - the agent interrupts the task initially - now the task status (and step statuses) are updated to canceled
        if (
          data.status == TaskStatus.INTERRUPTED &&
          (currentTaskOutcome.status == TaskStatus.CANCELLED || currentTaskOutcome.status == TaskStatus.CANCELING)
        ) {
          updatedTaskOutcome = await TaskOutcomeModel.findOneAndUpdate(
            filter,
            { status: TaskStatus.CANCELLED },
            { new: true }
          );
          if (updatedTaskOutcome) data.status = updatedTaskOutcome.status;
          const taskStepOutcomesQuery = await stepOutcomeService.findStepOutcomesForTask(_teamId, id, null, "_id");
          if (_.isArray(taskStepOutcomesQuery) && taskStepOutcomesQuery.length > 0) {
            for (let i = 0; i < taskStepOutcomesQuery.length; i++) {
              const stepOutcome: any = taskStepOutcomesQuery[i];
              await StepOutcomeModel.findOneAndUpdate(
                { _id: stepOutcome._id, _teamId, status: { $lte: StepStatus.INTERRUPTED } },
                { status: StepStatus.INTERRUPTED }
              );
              // await stepOutcomeService.updateStepOutcome(_teamId, stepOutcome._id, { status: StepStatus.CANCELLED }, null, { status: { $lte: StepStatus.INTERRUPTED } }, null, '_id');
            }
          }
        }

        if (updatedTaskOutcome.status >= TaskStatus.SUCCEEDED || updatedTaskOutcome.status == TaskStatus.INTERRUPTED) {
          const job: JobSchema = await jobService.UpdateJobStatus(
            _teamId,
            updatedTaskOutcome._jobId,
            logger,
            amqp,
            null,
            "name _jobDefId runId onJobTaskInterruptedAlertEmail onJobTaskInterruptedAlertSlackURL"
          );

          await RepublishTasksWaitingForAgent(_teamId, updatedTaskOutcome._agentId, logger, amqp);

          if (job.status != JobStatus.INTERRUPTING && job.status != JobStatus.INTERRUPTED)
            await this.LaunchDownstreamTasks(_teamId, job, updatedTaskOutcome, logger, amqp);

          if (job._jobDefId) {
            if (job.status == JobStatus.INTERRUPTED || job.status == JobStatus.FAILED) {
              try {
                await jobDefService.updateJobDef(
                  _teamId,
                  job._jobDefId,
                  { status: JobDefStatus.PAUSED },
                  logger,
                  amqp,
                  { status: JobDefStatus.RUNNING, pauseOnFailedJob: true }
                );
              } catch (e) {
                if (!(e instanceof MissingObjectError)) throw e;
              }
            }

            // jobService.LaunchReadyJobs(_teamId, job._jobDefId);
          }

          if (
            updatedTaskOutcome.status == TaskStatus.INTERRUPTED &&
            (job.onJobTaskInterruptedAlertEmail || job.onJobTaskInterruptedAlertSlackURL)
          ) {
            await SGUtils.OnTaskInterrupted(_teamId, updatedTaskOutcome, job, logger);
          }

          if (updatedTaskOutcome.status == TaskStatus.INTERRUPTED) {
            const taskQuery: TaskSchema[] = await taskService.findTask(
              _teamId,
              updatedTaskOutcome._taskId,
              "_id autoRestart"
            );
            if (_.isArray(taskQuery) && taskQuery.length > 0) {
              if (taskQuery[0].autoRestart) {
                updatedTaskOutcome = await TaskOutcomeModel.findOneAndUpdate(
                  filter,
                  { status: TaskStatus.CANCELLED },
                  { new: true }
                ).select(responseFields);
                if (updatedTaskOutcome) data.status = updatedTaskOutcome.status;
                await localRestAccess.RestAPICall(
                  `taskaction/republish/${taskQuery[0]._id}`,
                  "POST",
                  _teamId.toHexString(),
                  null,
                  null
                );
              }
            }
          }
        }
      }

      const deltas = Object.assign({ _id: id }, data);
      await rabbitMQPublisher.publish(
        _teamId,
        "TaskOutcome",
        correlationId,
        PayloadOperation.UPDATE,
        convertData(TaskOutcomeSchema, deltas)
      );

      await jobService.UpdateJobStatus(_teamId, updatedTaskOutcome._jobId, logger, null);

      return updatedTaskOutcome; // fully populated model
    } catch (err) {
      logger.LogError(err, { Class: "TaskOutcomeService", Method: "updateTaskOutcome", _teamId, taskOutcome: data });
      throw err;
    }
  }

  async LaunchDownstreamTasks(
    _teamId: mongodb.ObjectId,
    job: JobSchema,
    taskOutcome: TaskOutcomeSchema,
    logger: BaseLogger,
    amqp: AMQPConnector
  ) {
    let tasksToLaunch = [];
    let toRouteTasks = [];

    const filter: any = { _teamId, _id: taskOutcome._taskId };
    const task: TaskSchema = await TaskModel.findById(filter).select("name down_dep up_dep toRoutes _jobId");
    if (!task) throw new MissingObjectError(`Task not found with filter "${JSON.stringify(filter)}"`);

    const route = taskOutcome.route ? taskOutcome.route : "";
    if (task.toRoutes && job.status != JobStatus.CANCELING && job.status != JobStatus.COMPLETED) {
      for (let i = 0; i < task.toRoutes.length; i++) {
        let downStreamTaskName = task.toRoutes[i][0];
        let routePattern = /^(?!fail$).*$/;
        if (task.toRoutes[i].length > 1 && task.toRoutes[i][1])
          if (task.toRoutes[i][1] != ".*") routePattern = new RegExp(task.toRoutes[i][1]);

        if (route.search(routePattern) >= 0) {
          let downstreamTask = await taskService.findTaskByName(_teamId, task._jobId, downStreamTaskName, "_id");
          if (downstreamTask) {
            if (toRouteTasks.indexOf(downstreamTask._id.toHexString()) < 0)
              toRouteTasks.push(downstreamTask._id.toHexString());
            tasksToLaunch.push({
              taskId: downstreamTask._id,
              sourceTaskRoute: { sourceTaskOutcomeId: taskOutcome._id, sourceRoute: route },
            });
          } else {
            logger.LogError(`Unable to find Task with _jobId "${task._jobId}" and name "${downStreamTaskName}"`, {
              Class: "TaskOutcomeService",
              Method: "LaunchDownstreamTasks",
              _teamId,
              task: task,
            });
          }
        }
        // else if (route != 'fail') {
        //     await this.OnTaskSkipped(_teamId, task._jobId, downStreamTaskName, logger);
        // }
      }
    }

    if (task.down_dep) {
      for (let i = 0; i < task.down_dep.length; i++) {
        let downStreamTaskName = task.down_dep[i][0];
        if (job.status == JobStatus.CANCELING || job.status == JobStatus.COMPLETED) {
          await this.OnTaskSkipped(_teamId, task._jobId, downStreamTaskName, logger);
        } else {
          let routePattern = /^(?!fail$).*$/;
          if (task.down_dep[i].length > 1 && task.down_dep[i][1])
            if (task.down_dep[i][1] != ".*") routePattern = new RegExp(task.down_dep[i][1]);

          if (route.search(routePattern) >= 0) {
            let downstreamTask = await taskService.findTaskByName(
              _teamId,
              taskOutcome._jobId,
              downStreamTaskName,
              "_id"
            );
            if (downstreamTask) {
              let queryUpdate: any = {};
              queryUpdate[`up_dep.${task.name}`] = "";
              const taskFilter = { _teamId, _id: downstreamTask._id.toHexString() };
              downstreamTask = await TaskModel.findOneAndUpdate(taskFilter, { $unset: queryUpdate }).select(
                "_id up_dep"
              );
              if (
                downstreamTask.up_dep &&
                _.isPlainObject(downstreamTask.up_dep) &&
                Object.keys(downstreamTask.up_dep).length === 1 &&
                task.name in downstreamTask.up_dep
              ) {
                if (toRouteTasks.indexOf(downstreamTask._id.toHexString) < 0)
                  tasksToLaunch.push({ taskId: downstreamTask._id });
              }
            } else {
              logger.LogError(`Unable to find Task with _jobId "${task._jobId}" and name "${downStreamTaskName}"`, {
                Class: "TaskOutcomeService",
                Method: "LaunchDownstreamTasks",
                _teamId,
                _jobId: taskOutcome._jobId,
                taskOutcome: taskOutcome,
              });
            }
          } else if (route != "fail") {
            await this.OnTaskSkipped(_teamId, task._jobId, downStreamTaskName, logger);
          }
        }
      }
    }

    for (let i = 0; i < tasksToLaunch.length; i++) {
      await this.LaunchTask(_teamId, tasksToLaunch[i], logger, amqp);
    }
  }

  async LaunchTask(_teamId: mongodb.ObjectId, taskToLaunch: any, logger: BaseLogger, amqp: AMQPConnector) {
    // await FreeTierChecks.MaxScriptsCheck(_teamId);

    const _taskId: mongodb.ObjectId = taskToLaunch.taskId;
    let task: any;
    try {
      if (taskToLaunch.sourceTaskRoute) {
        const taskQuery = await taskService.findTask(_teamId, _taskId);
        if (!taskQuery || (_.isArray(taskQuery) && taskQuery.length == 0)) {
          logger.LogError(`No task found with id ${_taskId}`, {
            Class: "TaskOutcomeService",
            Method: "LaunchTask",
            _teamId,
            Task: task,
          });
          return;
        } else {
          task = taskQuery[0];
          task.sourceTaskRoute = taskToLaunch.sourceTaskRoute;
        }
      } else {
        task = await taskService.updateTask(
          _teamId,
          _taskId,
          { status: TaskStatus.NOT_STARTED },
          logger,
          { status: null },
          null,
          null
        );
      }
      console.log("2222222222222222222222222222222");
      await this.PublishTask(_teamId, task, logger, amqp);
    } catch (err) {
      if (err instanceof MissingObjectError) {
        logger.LogWarning(err.message, { Error: err, Class: "TaskOutcomeService", Method: "LaunchTask" });
      } else {
        logger.LogError(err.message, {
          Error: err,
          Class: "TaskOutcomeService",
          Method: "LaunchTask",
          _teamId,
          Task: task,
        });
      }
    }
  }

  async PublishTask(_teamId: mongodb.ObjectId, task: TaskSchema, logger: BaseLogger, amqp: AMQPConnector) {
    let success: boolean = false;
    try {
      const job: JobSchema = await jobService.findJob(_teamId, task._jobId, "runtimeVars");
      if (!job) {
        throw new MissingObjectError(`Job ${task._jobId} for task ${task._id} not found.`);
      }

      if (task.target == TaskDefTarget.SINGLE_SPECIFIC_AGENT)
        task.targetAgentId = await GetTargetAgentId(_teamId, task, job, logger);

      console.log("PublishTask ----------------------> task -> ", JSON.stringify(task, null, 4));
      let getTaskRoutesRes: IGetTaskRouteResult = await GetTaskRoutes(_teamId, task, logger);
      console.log(
        "PublishTask ----------------------> getTaskRoutesRes -> ",
        JSON.stringify(getTaskRoutesRes, null, 4)
      );
      if (!getTaskRoutesRes.routes) {
        let deltas: any;
        let taskFailed: boolean = false;
        if (getTaskRoutesRes.failureCode == TaskFailureCode.TARGET_AGENT_NOT_SPECIFIED) {
          taskFailed = true;
          deltas = { status: TaskStatus.FAILED, failureCode: getTaskRoutesRes.failureCode, route: "" };
          await taskService.updateTask(_teamId, task._id, deltas, logger);
        } else if (getTaskRoutesRes.failureCode == TaskFailureCode.NO_AGENT_AVAILABLE) {
          deltas = { status: TaskStatus.WAITING_FOR_AGENT, failureCode: getTaskRoutesRes.failureCode, route: "" };
          await taskService.updateTask(_teamId, task._id, deltas, logger);
        } else {
          taskFailed = true;
          deltas = { status: TaskStatus.FAILED, failureCode: getTaskRoutesRes.failureCode, route: "" };
          await taskService.updateTask(_teamId, task._id, deltas, logger);
          logger.LogError(`Unhandled failure code: ${getTaskRoutesRes.failureCode}`, {
            Class: "TaskOutcomeService",
            Method: "PublishTask",
            _teamId,
            task: task,
          });
        }

        if (taskFailed) {
          await SGUtils.OnTaskFailed(_teamId, task, TaskFailureCode[getTaskRoutesRes.failureCode], logger);
        }

        // Object.assign(deltas, { _id: task._id });
        // await rabbitMQPublisher.publish(_teamId, "Task", null, PayloadOperation.UPDATE, convertData(TaskOutcomeSchema, deltas));
        // await amqp.PublishQueue('worker', config.get('rmqNoAgentForTaskQueue'), convertData(TaskSchema, task), { exclusive: false, durable: true, autoDelete: false });
      } else {
        if (getTaskRoutesRes.task) task = getTaskRoutesRes.task;
        // console.log('PublishTask -> task -> ', JSON.stringify(task, null, 4));
        const routes = getTaskRoutesRes.routes;
        let steps: StepSchema[] = [];
        let runtimeVarsTask: any = {};
        let allScriptsToInject: any = {};
        if (task.runtimeVars) runtimeVarsTask = Object.assign(runtimeVarsTask, task.runtimeVars);
        for (let step of await stepService.findAllTaskSteps(_teamId, task._id)) {
          if (step.variables) {
            for (let e = 0; e < Object.keys(step.variables).length; e++) {
              let eKey = Object.keys(step.variables)[e];
              if (!runtimeVarsTask[eKey]) {
                if (job.runtimeVars[eKey]) {
                  runtimeVarsTask[eKey] = job.runtimeVars[eKey];
                } else {
                  const teamVar = await teamVariableService.findTeamVariableByName(_teamId, eKey, "value");
                  if (_.isArray(teamVar) && teamVar.length > 0) runtimeVarsTask[eKey] = teamVar[0].value;
                }
              }
            }
          }

          let arrFindVarsArgs: string[] = step.arguments.match(/@sgg?(\([^)]*\))/gi);
          if (arrFindVarsArgs) {
            // replace runtime variables in arguments
            for (let i = 0; i < arrFindVarsArgs.length; i++) {
              try {
                let varKey = arrFindVarsArgs[i].substr(5, arrFindVarsArgs[i].length - 6);
                if (varKey.substr(0, 1) === '"' && varKey.substr(varKey.length - 1, 1) === '"')
                  varKey = varKey.slice(1, -1);
                if (!runtimeVarsTask[varKey]) {
                  if (job.runtimeVars[varKey]) {
                    runtimeVarsTask[varKey] = job.runtimeVars[varKey];
                  } else {
                    const teamVar = await teamVariableService.findTeamVariableByName(_teamId, varKey, "value");
                    if (_.isArray(teamVar) && teamVar.length > 0) {
                      runtimeVarsTask[varKey]["value"] = teamVar[0].value;
                      runtimeVarsTask[varKey]["sensitive"] = teamVar[0].sensitive;
                    }
                  }
                }
              } catch (e) {
                logger.LogError(`Error in arguments @sgg capture for string \"${arrFindVarsArgs[i]}\": ${e.message}`, {
                  Class: "TaskOutcomeService",
                  Method: "PublishTask",
                  _teamId,
                  task: task,
                });
              }
            }
          }

          const script_code = SGUtils.atob(step.script.code);
          let rtvScript = await SGUtils.getRuntimeVarsForScript(_teamId, script_code, job);
          runtimeVarsTask = Object.assign(runtimeVarsTask, rtvScript);

          let scriptsToInject = await SGUtils.getInjectedScripts(_teamId, script_code);
          allScriptsToInject = Object.assign(allScriptsToInject, scriptsToInject);

          for (let i = 0; i < Object.keys(scriptsToInject).length; i++) {
            const scriptId = Object.keys(scriptsToInject)[i];
            const script_code = SGUtils.atob(scriptsToInject[scriptId]);
            let rtvScript = await SGUtils.getRuntimeVarsForScript(_teamId, script_code, job);
            runtimeVarsTask = Object.assign(runtimeVarsTask, rtvScript);
          }

          steps.push(convertData(StepSchema, step));
        }

        task.runtimeVars = runtimeVarsTask;
        task.scriptsToInject = allScriptsToInject;
        let convertedTask: any = convertData(TaskSchema, task);
        convertedTask.steps = steps;
        // console.log('PublishTask -> task with steps -> ', JSON.stringify(convertedTask, null, 4));

        let ttl = config.get("defaultQueuedTaskTTL");

        await taskService.updateTask(_teamId, task._id, { status: TaskStatus.PUBLISHED, failureCode: "" }, logger);

        for (let i = 0; i < routes.length; i++) {
          if (routes[i]["type"] == "queue") {
            // logger.LogDebug(`Publishing task`, { Class: 'TaskOutcomeService', Method: 'PublishTask', _teamId, task: convertedTask, route: routes[i]['route'] });
            await amqp.PublishQueue(
              SGStrings.GetTeamExchangeName(_teamId.toHexString()),
              routes[i]["route"],
              convertedTask,
              routes[i]["queueAssertArgs"],
              { expiration: ttl }
            );
          } else {
            await amqp.PublishRoute(
              SGStrings.GetTeamExchangeName(_teamId.toHexString()),
              routes[i]["route"],
              convertedTask
            );
          }
        }
        success = true;
      }

      await jobService.UpdateJobStatus(_teamId, task._jobId, logger, null);
      return { success };
    } catch (err) {
      // logger.LogDebug(`Error publishing task`, { Class: 'TaskOutcomeService', Method: 'PublishTask', err });
      task.error = err.message;
      await amqp.PublishQueue("worker", config.get("rmqTaskLaunchErrorQueue"), convertData(TaskSchema, task), {
        exclusive: false,
        durable: true,
        autoDelete: false,
      });
      return { success: false };
    }
  }

  async GetDependentTasks(downstreamDependencies: string[][]) {
    let dependentTasks: string[] = [];

    if (downstreamDependencies) {
      for (let i = 0; i < downstreamDependencies.length; i++) {
        dependentTasks.push(downstreamDependencies[i][0]);
      }
    }

    return dependentTasks;
  }

  async OnTaskSkipped(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, taskName: string, logger: BaseLogger) {
    return new Promise<void>(async (resolve, reject) => {
      let resUpdate;

      try {
        const task: TaskSchema = await taskService.findTaskByName(_teamId, _jobId, taskName);
        if (!task) {
          logger.LogError(`Error in OnTaskSkipped - task not found`, { _teamId, _jobId: _jobId, taskName: taskName });
          resolve();
          return;
        }

        // console.log('OnTaskSkipped -> task -> ', JSON.stringify(task, null, 4));

        const currentTaskStatus = task.status;
        if (currentTaskStatus != null) {
          resolve();
          return;
        }

        task.status = TaskStatus.SKIPPED;
        resUpdate = await taskService.updateTask(_teamId, task._id, { status: TaskStatus.SKIPPED }, logger);

        // console.log('OnTaskSkipped -> resUpdate -> ', JSON.stringify(resUpdate, null, 4));

        if (task.down_dep) {
          let dependentTask: string[] = await this.GetDependentTasks(task.down_dep);
          for (let i = 0; i < dependentTask.length; i++) {
            await this.OnTaskSkipped(_teamId, _jobId, dependentTask[i], logger);
          }
        }

        resolve();
      } catch (err) {
        reject(`Error in JobService.OnTaskSkipped: ${err}`);
      }
    });
  }
}

export const taskOutcomeService = new TaskOutcomeService();
