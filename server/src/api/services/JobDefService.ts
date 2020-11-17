import { convertData } from '../utils/ResponseConverters';
import { JobDefSchema, JobDefModel } from '../domain/JobDef';
import { StepDefSchema, StepDefModel } from '../domain/StepDef';
import { TaskDefSchema, TaskDefModel } from '../domain/TaskDef';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import { JobDefStatus, ScriptType, TaskDefTarget } from '../../shared/Enums';
import { jobService } from './JobService';
import { scriptService } from './ScriptService';
import { stepDefService } from './StepDefService';
import { taskDefService } from './TaskDefService';
import { agentService } from './AgentService';
import { scheduleService } from './ScheduleService';
import { SGUtils } from '../../shared/SGUtils';
import * as _ from 'lodash';


export class JobDefService {

  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }

  public async findAllJobDefsInternal(filter?: any, responseFields?: string) {
    return JobDefModel.find(filter).select(responseFields);
  }

  public async findJobDef(_teamId: mongodb.ObjectId, jobDefId: mongodb.ObjectId, responseFields?: string) {
    return JobDefModel.findById(jobDefId).find({ _teamId }).select(responseFields);
  }


  public async createJobDefInternal(data: any): Promise<object> {
    const model = new JobDefModel(data);
    const newJobDef = await model.save();
    return newJobDef;
  }


  public async createJobDef(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
    const existingJobDefQuery: any = await this.findAllJobDefsInternal({ _teamId, name: data.name });
    if (_.isArray(existingJobDefQuery) && existingJobDefQuery.length > 0)
        throw new ValidationError(`Job definition with name "${data.name}" already exists`);
      
    data._teamId = _teamId;
    const jobDefModel = new JobDefModel(data);
    const newJobDef = await jobDefModel.save();

    await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.CREATE, convertData(JobDefSchema, newJobDef));

    return this.findJobDef(_teamId, newJobDef._id, responseFields);
  }


  public async createJobDefFromJobDef(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
    data._teamId = _teamId;

    if (!data._jobDefId)
      throw new ValidationError('Request body missing "_jobDefId"');

    if (!data.createdBy)
      throw new ValidationError('Request body missing "createdBy"');

    const jobDefSourceQuery = await this.findJobDef(_teamId, new mongodb.ObjectId(data._jobDefId));
    if (!jobDefSourceQuery || (_.isArray(jobDefSourceQuery) && jobDefSourceQuery.length === 0))
      throw new MissingObjectError(`JobDef ${data._jobDefId} not found.`);
    const jobDefSource = jobDefSourceQuery[0];

    const jobDef_data = {
      _teamId: data._teamId,
      name: `${jobDefSource.name} Copy`,
      createdBy: data.createdBy,
      maxInstances: jobDefSource.maxInstances,
      misfireGraceTime: jobDefSource.misfireGraceTime,
      coalesce: jobDefSource.coalesce,
      runtimeVars: _.cloneDeep(jobDefSource.runtimeVars),
      pauseOnFailedJob: jobDefSource.pauseOnFailedJob,
      onJobTaskFailAlertEmail: jobDefSource.onJobTaskFailAlertEmail,
      onJobCompleteAlertEmail: jobDefSource.onJobCompleteAlertEmail,
      onJobTaskInterruptedAlertEmail: jobDefSource.onJobTaskInterruptedAlertEmail,
      onJobTaskFailAlertSlackURL: jobDefSource.onJobTaskFailAlertSlackURL,
      onJobCompleteAlertSlackURL: jobDefSource.onJobCompleteAlertSlackURL,
      onJobTaskInterruptedAlertSlackURL: jobDefSource.onJobTaskInterruptedAlertSlackURL
    };
    const jobDefModel = new JobDefModel(jobDef_data);
    const newJobDef = await jobDefModel.save();

    let taskDefsSourceQuery: TaskDefSchema[] = await taskDefService.findJobDefTaskDefs(_teamId, data._jobDefId);
    for (let i = 0; i < taskDefsSourceQuery.length; i++) {
      let taskDefSource: TaskDefSchema = taskDefsSourceQuery[i];

      const taskDef_data = {
        _teamId: data._teamId,
        _jobDefId: newJobDef._id,
        target: taskDefSource.target,
        name: taskDefSource.name,
        order: taskDefSource.order,
        targetAgentId: taskDefSource.targetAgentId,
        requiredTags: taskDefSource.requiredTags,
        fromRoutes: taskDefSource.fromRoutes,
        toRoutes: taskDefSource.toRoutes,
        artifacts: taskDefSource.artifacts,
      }

      const taskDefReq: any = await taskDefService.createTaskDef(_teamId, taskDef_data, correlationId, '_id');
      const newTaskDef = taskDefReq[0];


      let stepDefsSourceQuery: StepDefSchema[] = await stepDefService.findTaskDefStepDefs(_teamId, taskDefSource._id);
      for (let i = 0; i < stepDefsSourceQuery.length; i++) {
        let stepDefSource: StepDefSchema = stepDefsSourceQuery[i];

        const stepDef_data = {
          _teamId: stepDefSource._teamId,
          _taskDefId: newTaskDef._id,
          name: stepDefSource.name,
          _scriptId: stepDefSource._scriptId,
          order: stepDefSource.order,
          command: stepDefSource.command,
          arguments: stepDefSource.arguments,
          variables: stepDefSource.variables,
        }

        const stepDefReq: any = await stepDefService.createStepDef(_teamId, stepDef_data, correlationId, '_id');
      }
    }

    await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.CREATE, convertData(JobDefSchema, newJobDef));

    return this.findJobDef(_teamId, newJobDef._id, responseFields);
  }


  public async createJobDefFromScript(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
    data._teamId = _teamId;

    if (!data._scriptId)
      throw new ValidationError('Request body missing "_scriptId"');

    if (!data.createdBy)
      throw new ValidationError('Request body missing "createdBy"');

    const scriptReq = await scriptService.findScript(_teamId, new mongodb.ObjectId(data._scriptId), '_id name');
    if (!scriptReq || (_.isArray(scriptReq) && scriptReq.length === 0))
      throw new MissingObjectError(`Script ${data._scriptId} not found.`);
    const script = scriptReq[0];

    const jobDef_data = {
      _teamId,
      name: `${script.name} job`,
      createdBy: data.createdBy
    };
    const jobDefModel = new JobDefModel(jobDef_data);
    const newJobDef = await jobDefModel.save();

    const taskDef_data = {
      _teamId,
      _jobDefId: newJobDef._id,
      target: TaskDefTarget.SINGLE_AGENT,
      name: 'task'
    };
    const taskDefReq: any = await taskDefService.createTaskDef(_teamId, taskDef_data, correlationId, '_id');
    const taskDef = taskDefReq[0];

    const stepDef_data = {
      _teamId,
      _taskDefId: taskDef._id,
      name: 'step',
      _scriptId: script._id,
      order: 1
    };
    await stepDefService.createStepDef(_teamId, stepDef_data, correlationId, '_id');

    await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.CREATE, convertData(JobDefSchema, newJobDef));

    return this.findJobDef(_teamId, newJobDef._id, responseFields);
  }


  public async createJobDefFromCron(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
    data._teamId = _teamId;

    if (!data.cronString)
      throw new ValidationError('Request body missing "cronString"');

    if (!data._agentId)
      throw new ValidationError('Request body missing "_agentId"');

    if (!data.createdBy)
      throw new ValidationError('Request body missing "createdBy"');

    const agentReq = await agentService.findAgent(_teamId, new mongodb.ObjectId(data._agentId), '_id machineId timezone');
    if (!agentReq || (_.isArray(agentReq) && agentReq.length === 0))
      throw new MissingObjectError(`Agent ${data._agentId} not found.`);
    const agent = agentReq[0];

    const cronJobUniqueId = SGUtils.makeid(5);

    const jobDef_data = {
      _teamId,
      name: `Cron Job ${agent.machineId} - ${cronJobUniqueId}`,
      createdBy: data.createdBy
    };
    const jobDefModel = new JobDefModel(jobDef_data);
    const newJobDef = await jobDefModel.save();

    const tokens = data.cronString.split(' ');

    const code = SGUtils.btoa(tokens.slice(5).join(' '));
    const script_data = {
      _teamId,
      name: `cron-${agent.machineId}-${cronJobUniqueId}`,
      scriptType: ScriptType.SH,
      code: code,
      shadowCopyCode: code,
      teamEditable: true
    };
    const scriptReq: any = await scriptService.createScript(_teamId, script_data, data.createdBy, correlationId, '_id');
    const script = scriptReq[0];

    const taskDef_data = {
      _teamId,
      _jobDefId: newJobDef._id,
      target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
      name: 'task',
      targetAgentId: agent._id.toHexString()
    };
    const taskDefReq: any = await taskDefService.createTaskDef(_teamId, taskDef_data, correlationId, '_id');
    const taskDef = taskDefReq[0];

    const stepDef_data = {
      _teamId,
      _taskDefId: taskDef._id,
      name: 'step',
      _scriptId: script._id,
      variables: data.envVars,
      order: 1
    };
    await stepDefService.createStepDef(_teamId, stepDef_data, correlationId, '_id');

    await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.CREATE, convertData(JobDefSchema, newJobDef));

    const schedule_data: any = {
      _teamId,
      _jobDefId: newJobDef._id,
      name: 'Schedule from Cron',
      createdBy: data.createdBy,
      lastUpdatedBy: data.createdBy,
      isActive: true,
      TriggerType: 'cron',
      cron: {
        Day_Of_Week: tokens[4],
        Month: tokens[3],
        Day: tokens[2],
        Hour: tokens[1],
        Minute: tokens[0],
      },
      FunctionKwargs: {
        _teamId,
        targetId: newJobDef._id
      }
    };
    if (agent.timezone)
      schedule_data.cron.Timezone = agent.timezone;
    await scheduleService.createSchedule(_teamId, schedule_data, correlationId, '_id');

    return this.findJobDef(_teamId, newJobDef._id, responseFields);
  }


  public async updateJobDef(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, filter?: any, correlationId?: string, userEmail?: string, responseFields?: string): Promise<object> {
    if (data.name) {
      const exitingJobDefQuery: any = await this.findAllJobDefsInternal({ _teamId, name: data.name });
      if (_.isArray(exitingJobDefQuery) && exitingJobDefQuery.length > 0)
        if (exitingJobDefQuery[0]._id.toHexString() != id.toHexString())
          throw new ValidationError(`Job definition with name "${data.name}" already exists`);
    }

    const defaultFilter = { _id: id, _teamId };
    if (filter)
      filter = Object.assign(defaultFilter, filter);
    else
      filter = defaultFilter;

    const jobDef = await JobDefModel.findOneAndUpdate(filter, data);

    if (!jobDef)
      throw new MissingObjectError(`Job template with id '${id}' not found.`)

    if (data.status == JobDefStatus.RUNNING && jobDef.status == JobDefStatus.PAUSED)
      await jobService.LaunchReadyJobs(_teamId, id);

    let deltas = Object.assign({ _id: id }, data);
    let convertedDeltas = convertData(JobDefSchema, deltas);
    await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.UPDATE, convertedDeltas, userEmail);

    return this.findJobDef(_teamId, id, responseFields);
  }


  public async deleteJobDef(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId?: string): Promise<void> {
    const deleted = await JobDefModel.deleteOne({ _id: id });

    await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.DELETE, { id, correlationId });

    return deleted;
  }
}

export const jobDefService = new JobDefService();