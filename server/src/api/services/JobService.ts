import { convertData } from '../utils/ResponseConverters';
import { JobSchema, JobModel } from '../domain/Job';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { TaskSchema, TaskModel } from '../domain/Task';
import { JobDefModel } from '../domain/JobDef';
import { StepSchema } from '../domain/Step';
import { ScriptSchema } from '../domain/Script';
import { taskDefService } from '../services/TaskDefService';
import { stepDefService } from '../services/StepDefService';
import { taskService } from '../services/TaskService';
import { taskOutcomeService } from '../services/TaskOutcomeService';
import { stepService } from '../services/StepService';
import { scriptService } from '../services/ScriptService';
import { teamService } from './TeamService';
import { TeamSchema } from '../domain/Team';
import { BaseLogger } from '../../shared/SGLogger';
import * as Enums from '../../shared/Enums';
import { SGUtils } from '../../shared/SGUtils';
import { AMQPConnector } from '../../shared/AMQPLib';
import * as _ from 'lodash';
import * as config from 'config';
import { jobDefService } from '../services/JobDefService';
import { JobDefSchema } from '../domain/JobDef';
import { MissingObjectError, ValidationError, } from '../utils/Errors';
import { FreeTierChecks } from '../../shared/FreeTierChecks';
import * as mongodb from 'mongodb';
import { stepOutcomeService } from './StepOutcomeService';


let appName: string = 'JobService';
const amqpUrl = config.get('amqpUrl');
const rmqVhost = config.get('rmqVhost');
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();
let amqp: AMQPConnector = new AMQPConnector(appName, '', amqpUrl, rmqVhost, 1, (activeMessages) => { }, logger);
amqp.Start();

export class JobService {

    // Some services might need to add additional restrictions to bulk queries
    // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
    // public async updateBulkQuery(query): Promise<object> {
    //   // modify query here
    //   return query;
    // }


    public async findAllJobsInternal(filter?: any, responseFields?: string, limit?: number) {
        return JobModel.find(filter).select(responseFields).limit(limit);
    }


    public async findJob(_teamId: mongodb.ObjectId, jobId: mongodb.ObjectId, responseFields?: string) {
        return JobModel.findById(jobId).find({ _teamId }).select(responseFields);
    }


    public async createJobInternal(data: any): Promise<object> {
        const model = new JobModel(data);
        await model.save();
        return;
    }


    public async deleteJobs(_teamId: mongodb.ObjectId, filter: any, logger: BaseLogger, correlationId?: string): Promise<object> {
        let res: any = {"ok": 1, "deletedCount": 0};

        const jobsQuery = await JobModel.find(filter).select('id');
        if (_.isArray(jobsQuery) && jobsQuery.length === 0) {
            res.n = 0;
        } else {
            res.n = jobsQuery.length;
            for (let i = 0; i < jobsQuery.length; i++) {
                const job: any = jobsQuery[i];

                let deleteStepOutcomeRes: any = await stepOutcomeService.deleteStepOutcome(_teamId, job._id, correlationId);
                // if (deleteStepOutcomeRes.n != deleteStepOutcomeRes.deletedCount)
                //     logger.LogError(`Error deleting step outcomes for job "${job._id}": ${deleteStepOutcomeRes.n} step outcomes exist but ${deleteStepOutcomeRes.deletedCount} deleted`, {});

                let deleteTaskOutcomeRes: any = await taskOutcomeService.deleteTaskOutcome(_teamId, job._id, correlationId);
                // if (deleteTaskOutcomeRes.n != deleteTaskOutcomeRes.deletedCount)
                //     logger.LogError(`Error deleting task outcomes for job "${job._id}": ${deleteTaskOutcomeRes.n} task outcomes exist but ${deleteTaskOutcomeRes.deletedCount} deleted`, {});

                let deleteStepRes: any = await stepService.deleteStep(_teamId, job._id, correlationId);
                // if (deleteStepRes.n != deleteStepRes.deletedCount)
                //     logger.LogError(`Error deleting steps for job "${job._id}": ${deleteStepRes.n} steps exist but ${deleteStepRes.deletedCount} deleted`, {});

                let deleteTaskRes: any = await taskService.deleteTask(_teamId, job._id, correlationId);
                // if (deleteTaskRes.n != deleteTaskRes.deletedCount)
                //     logger.LogError(`Error deleting tasks for job "${job._id}": ${deleteTaskRes.n} tasks exist but ${deleteTaskRes.deletedCount} deleted`, {});

                let deleted = await JobModel.deleteOne({_id: job._id});
                if (deleted.ok) {
                    res.deletedCount += deleted.deletedCount;
                    await rabbitMQPublisher.publish(_teamId, "Job", correlationId, PayloadOperation.DELETE, { id: job._id });
                }
            }
        }

        return res;
    }


    public async createJobFromJobDefId(_teamId: mongodb.ObjectId, _jobDefId: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        const filterJobDef = { _id: _jobDefId, _teamId };
        const jobDef = await JobDefModel.findOneAndUpdate(filterJobDef, { $inc: { 'lastRunId': 1 } }).select('lastRunId name createdBy runtimeVars');
        if (!jobDef)
            throw new MissingObjectError(`Job template '${_jobDefId}" not found`);
        await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.UPDATE, { id: jobDef._id, lastRunId: jobDef.lastRunId });

        return this.createJobFromJobDef(_teamId, jobDef, data, responseFields);
    }


    public async createJobFromJobDefName(_teamId: mongodb.ObjectId, jobDefName: string, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        const filterJobDef = { name: jobDefName, _teamId };
        const jobDef = await JobDefModel.findOneAndUpdate(filterJobDef, { $inc: { 'lastRunId': 1 } }).select('lastRunId name createdBy runtimeVars');
        if (!jobDef)
            throw new MissingObjectError(`Job template '${jobDefName}" not found`);
        await rabbitMQPublisher.publish(_teamId, "JobDef", correlationId, PayloadOperation.UPDATE, { id: jobDef._id, lastRunId: jobDef.lastRunId });

        return this.createJobFromJobDef(_teamId, jobDef, data, responseFields);
    }


    public async createJobFromJobDef(_teamId: mongodb.ObjectId, jobDef: any, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        let runtimeVars: any = {};
        if (jobDef.runtimeVars)
            runtimeVars = <any>jobDef.runtimeVars;

        if ('runtimeVars' in data)
            runtimeVars = Object.assign(runtimeVars, data.runtimeVars);

        let jobName = jobDef.name;
        if ('name' in data)
            jobName = data.name;

        let createdBy = jobDef.createdBy;
        if ('createdBy' in data)
            createdBy = data.createdBy;
    
        let job: any = {
            _teamId: _teamId,
            _jobDefId: jobDef._id,
            runId: jobDef.lastRunId,
            name: jobName,
            createdBy: createdBy,
            dateCreated: new Date().toISOString(),
            dateScheduled: data.dateScheduled,
            status: Enums.JobStatus.NOT_STARTED,
            runtimeVars: runtimeVars,
            onJobTaskFailAlertEmail: jobDef.onJobTaskFailAlertEmail,
            onJobCompleteAlertEmail: jobDef.onJobCompleteAlertEmail,
            onJobTaskInterruptedAlertEmail: jobDef.onJobTaskInterruptedAlertEmail,
            onJobTaskFailAlertSlackURL: jobDef.onJobTaskFailAlertSlackURL,
            onJobCompleteAlertSlackURL: jobDef.onJobCompleteAlertSlackURL,
            onJobTaskInterruptedAlertSlackURL: jobDef.onJobTaskInterruptedAlertSlackURL
        };

        const jobModel = new JobModel(job);
        const newJob = await jobModel.save();
        await rabbitMQPublisher.publish(_teamId, "Job", correlationId, PayloadOperation.CREATE, convertData(JobSchema, newJob));

        try {
            const taskDefs = await taskDefService.findJobDefTaskDefs(_teamId, jobDef._id);
            let cd = SGUtils.isJobDefCyclical(taskDefs);
            if (Object.keys(cd).length > 0)
                throw new ValidationError(`Job contains a cyclic dependency with the following tasks: ${Object.keys(cd).filter((key) => cd[key])}`)

            for (let taskDef of taskDefs) {
                if (taskDef.target == Enums.TaskDefTarget.AWS_LAMBDA) {
                    FreeTierChecks.PaidTierRequired(_teamId, 'Please uprade to the paid tier to run Lambda tasks');
                }
            }
            // console.log('JobService -> createJobFromJobDef -> taskDefs -> ', JSON.stringify(taskDefs, null, 4));
            const downstreamDependencies = await SGUtils.GenerateDownstreamDependenciesForJobTasks(taskDefs);
            // console.log('JobService -> createJobFromJobDef -> downstreamDependencies -> ', JSON.stringify(downstreamDependencies, null, 4));

            for (let taskDef of taskDefs) {
                // console.log('JobService -> createJobFromJobDef -> taskDef -> ', taskDef);
                let task: TaskSchema = {
                    _teamId: _teamId,
                    _jobId: newJob._id,
                    name: taskDef.name,
                    status: null,
                    targetAgentId: taskDef.targetAgentId,
                    requiredTags: taskDef.requiredTags,
                    target: taskDef.target,
                    fromRoutes: taskDef.fromRoutes,
                    toRoutes: taskDef.toRoutes,
                    artifacts: taskDef.artifacts,
                    runtimeVars: {},
                    source: Enums.TaskSource.JOB,
                    up_dep: {},
                    down_dep: downstreamDependencies[taskDef.name],
                    autoRestart: taskDef.autoRestart
                };
                if (task.fromRoutes) {
                    for (let i = 0; i < task.fromRoutes.length; i++)
                        task.up_dep[task.fromRoutes[i][0]] = task.fromRoutes[i][1];
                }

                const taskModel: TaskSchema = <TaskSchema>await taskService.createTask(_teamId, task, correlationId);

                for (let stepDef of await stepDefService.findAllStepDefs(_teamId, taskDef._id)) {
                    // console.log('JobService -> createJobFromJobDef -> stepDef -> ', stepDef);
                    const scripts: ScriptSchema[] = await scriptService.findScript(_teamId, stepDef._scriptId)
                    if (!scripts || scripts.length < 1)
                        throw new MissingObjectError(`Script "${stepDef._scriptId}" not found for task "${taskModel.name}"`);
                    const script = scripts[0];
                    let step: StepSchema = {
                        _teamId: _teamId,
                        _jobId: newJob._id,
                        _taskId: taskModel._id,
                        name: stepDef.name,
                        order: stepDef.order,
                        arguments: stepDef.arguments,
                        variables: stepDef.variables,
                        lambdaRuntime: stepDef.lambdaRuntime,
                        lambdaRole: config.get('lambda-admin-iam-role'),
                        lambdaMemorySize: stepDef.lambdaMemorySize,
                        lambdaTimeout: stepDef.lambdaTimeout,
                        lambdaZipfile: stepDef.lambdaZipfile,
                        lambdaFunctionHandler: stepDef.lambdaFunctionHandler,
                        lambdaAWSRegion: stepDef.lambdaAWSRegion,
                        lambdaDependencies: stepDef.lambdaDependencies,
                        script: {
                            id: script._id,
                            name: script.name,
                            scriptType: script.scriptType,
                            code: script.code,
                        }
                    };

                    if (taskModel.target == Enums.TaskDefTarget.AWS_LAMBDA)
                        step.s3Bucket = config.get('S3_BUCKET_TEAM_ARTIFACTS');

                    const stepModel: StepSchema = <StepSchema>await stepService.createStep(_teamId, step, correlationId);
                }
            }

            this.LaunchReadyJobs(_teamId, job._jobDefId);

            if (responseFields) {
                // It's is a bit wasteful to do another query but I can't chain a save with a select
                return this.findJob(_teamId, newJob._id, responseFields);
            }
            else {
                return newJob; // fully populated model
            }
        }
        catch (err) {
            if (newJob) {
                await this.updateJob(_teamId, newJob._id, { status: Enums.JobStatus.FAILED, error: err.message });
            }
            throw err;
        }
    }


    public async createJob(_teamId: mongodb.ObjectId, data: any, createdBy: mongodb.ObjectId, source: Enums.TaskSource, logger: BaseLogger, correlationId?: string, responseFields?: string): Promise<object> {
        SGUtils.validateJob(data.job);

        let newJob: JobSchema = null;
        try {
            let job: any = data.job;
            Object.assign(job, {
                _teamId: _teamId,
                createdBy: createdBy,
                dateCreated: new Date().toISOString(),
                dateStarted: new Date().toISOString(),
                status: Enums.JobStatus.RUNNING
            });

            if (!('runtimeVars' in job))
                job.runtimeVars = {};

            const jobModel = new JobModel(job);
            newJob = await jobModel.save();
            await rabbitMQPublisher.publish(_teamId, "Job", correlationId, PayloadOperation.CREATE, convertData(JobSchema, newJob));

            const tasks: any[] = job.tasks;
            await SGUtils.GenerateDownstreamDependenciesForJobTasks(tasks);

            for (let task of tasks) {
                Object.assign(task, {
                    _teamId: _teamId,
                    _jobId: newJob._id,
                    status: null,
                    source: source,
                    runtimeVars: {},
                    up_dep: {}
                });
                if (task.fromRoutes) {
                    for (let i = 0; i < task.fromRoutes.length; i++)
                        task.up_dep[task.fromRoutes[i][0]] = task.fromRoutes[i][1];
                }

                const taskModel: TaskSchema = <TaskSchema>await taskService.createTask(_teamId, task, correlationId);

                // if (taskModel.target == Enums.TaskDefTarget.AWS_LAMBDA) {
                //     const newLambdaStep: StepSchema = {
                //       _taskId: taskModel.id,
                //       _teamId,
                //       _jobId: newJob._id,
                //       name: 'AwsLambda',
                //       script: {
                //         "scriptType": "PYTHON",
                //         "code": "aW1wb3J0IHRpbWUKcHJpbnQgJ3N0YXJ0Jwp0aW1lLnNsZWVwKDUpCnByaW50ICdkb25lJwpwcmludCAnQHNnb3sicm91dGUiOiAib2sifSc="
                //     },
                //       order: 1,
                //       arguments: '',
                //       variables: new Map([]),
                //       lambdaCodeSource: 'script',
                //       lambdaMemorySize: 128,
                //       lambdaTimeout: 3,
                //       lambdaFunctionHandler: '',
                //       lambdaDependencies: '',
                //       lambdaRuntime: '.NET Core 3.1 (C#/PowerShell)'
                //     };
                //   }
              


                for (let step of task.steps) {
                    let script: ScriptSchema;
                    if (step.script.script_id) {
                        const scripts: ScriptSchema[] = await scriptService.findScript(_teamId, step.script._id)
                        if (!scripts || scripts.length < 1)
                            throw new MissingObjectError(`Script '${step.script._id}" not found for task "${taskModel.name}'`);
                        script = scripts[0];
                        Object.assign(step.script, {
                            code: script.code
                        });
                    }
                    Object.assign(step.script, { scriptType: Enums.ScriptType[step.script.scriptType] });
                    Object.assign(step, {
                        _teamId: _teamId,
                        _jobId: newJob._id,
                        _taskId: taskModel._id,
                        lambdaRole: config.get('lambda-admin-iam-role')
                    });

                    if (task.target == Enums.TaskDefTarget.AWS_LAMBDA)
                        step.s3Bucket = config.get('S3_BUCKET_TEAM_ARTIFACTS');                    

                    await stepService.createStep(_teamId, step, correlationId);
                }
            }

            await this.LaunchTasksWithNoUpstreamDependencies(_teamId, newJob._id, logger);

            if (responseFields) {
                // It's is a bit wasteful to do another query but I can't chain a save with a select
                return this.findJob(_teamId, newJob._id, responseFields);
            }
            else {
                return newJob; // fully populated model
            }
        }
        catch (err) {
            if (newJob) {
                await this.updateJob(_teamId, newJob._id, { status: Enums.JobStatus.FAILED, error: err.message });
            }
            throw err;
        }
    }


    public async updateJob(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, filter?: any, correlationId?: string, responseFields?: string): Promise<object> {
        const defaultFilter = { _id: id, _teamId };
        if (filter)
            filter = Object.assign(defaultFilter, filter);
        else
            filter = defaultFilter;
        const job = await JobModel.findOneAndUpdate(filter, data);

        if (!job)
            throw new MissingObjectError(`Job '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        /// When an interrupted/failed job is running, succeded, canceled or skipped (and there are no other interrupted/failed jobs), resume the job definition
        if (job._jobDefId) {
            if (data.status == Enums.JobStatus.RUNNING || data.status == Enums.JobStatus.COMPLETED || data.status == Enums.JobStatus.SKIPPED) {
                if (job.status == Enums.JobStatus.INTERRUPTED || job.status == Enums.JobStatus.CANCELING || job.status == Enums.JobStatus.FAILED) {
                    const failedJobs: JobSchema[] = <JobSchema[]>await this.findAllJobsInternal({ _teamId, _jobDefId: job._jobDefId, $or: [{ status: Enums.JobStatus.INTERRUPTED }, { status: Enums.JobStatus.FAILED }] }, 'id');
                    if (!failedJobs || (_.isArray(failedJobs) && failedJobs.length < 1)) {
                        try {
                            await jobDefService.updateJobDef(_teamId, job._jobDefId, { status: Enums.JobDefStatus.RUNNING }, { status: Enums.JobDefStatus.PAUSED });
                        } catch (e) {
                            if (!(e instanceof MissingObjectError))
                                throw e;
                        }
                    }
                }
            }

            if (data.status >= Enums.JobStatus.COMPLETED)
                await jobService.LaunchReadyJobs(_teamId, job._jobDefId);
        }


        // The data has the deltas that the rabbit listeners need get.  If there was any calculated data it would need to be placed manually
        // inside of the deltas here.
        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "Job", correlationId, PayloadOperation.UPDATE, convertData(JobSchema, deltas));

        return this.findJob(_teamId, id, responseFields);
    }


    OnTaskStatusChanged(task: TaskSchema, logger: BaseLogger) {
        logger.LogInfo('Task status changed', convertData(TaskSchema, task));
    };


    async LaunchReadyJobs(_teamId: mongodb.ObjectId, _jobDefId: mongodb.ObjectId) {
        if (!_jobDefId)
            return;

        const currentTime: Date = new Date();
        const jobDef: JobDefSchema = await JobDefModel.findOneAndUpdate({ _teamId, _id: _jobDefId, launchingJobs: { $ne: true } }, { launchingJobs: true }).select('maxInstances misfireGraceTime coalesce status');
        if (!jobDef) {
            const jobDefsExisting = await JobDefModel.findOne({ _teamId, _id: _jobDefId }).select('id');
            if (!jobDefsExisting)
                throw new MissingObjectError(`Job template ${_jobDefId.toHexString()} not found.`);
            else
                logger.LogError('Not launching job because job template launchingJobs property is true', { _jobDefId: _jobDefId.toHexString() });
            return;
        }

        try {
            /// Don't launch any jobs if the JobDef is paused
            if (jobDef.status == Enums.JobDefStatus.PAUSED) {
                logger.LogInfo('Not launching job because job template paused', { _jobDefId: _jobDefId.toHexString() });
                return;
            }

            /// Get jobs created but not started - if we're past the misfire grace time, skip the job
            ///     If multiple ready jobs and coalesce is true, run the most recent and skip the rest
            const queryNotStartedJobs: JobSchema[] = await this.findAllJobsInternal({ _jobDefId, _teamId, status: Enums.JobStatus.NOT_STARTED });
            let jobsToRun: JobSchema[] = [];
            if (_.isArray(queryNotStartedJobs) && queryNotStartedJobs.length > 0) {
                for (let i = 0; i < queryNotStartedJobs.length; i++) {
                    const job = queryNotStartedJobs[i];
                    if (_.isNumber(jobDef.misfireGraceTime) && job.dateScheduled) {
                        const lag = Math.floor((currentTime.getTime() - job.dateScheduled.getTime()) / 1000)
                        // console.log(`LaunchReadyJobs -> lag -> ${lag}`);
                        if (lag <= jobDef.misfireGraceTime) {
                            jobsToRun.push(job);
                        } else {
                            this.updateJob(_teamId, job._id, { status: Enums.JobStatus.SKIPPED, error: "Exceeded misfire grace time" });
                        }
                    } else {
                        jobsToRun.push(job);
                    }
                }

                /// Get count of running jobs
                let numRunningJobs: number = 0;
                const queryRunningJobs: JobSchema[] = await this.findAllJobsInternal({ _jobDefId: _jobDefId, _teamId, status: Enums.JobStatus.RUNNING }, 'id');
                if (_.isArray(queryRunningJobs) && queryRunningJobs.length > 0)
                    numRunningJobs = queryRunningJobs.length;

                /// Can't start more than maxInstances jobs
                let numJobsToStart = jobsToRun.length;
                if (jobDef.maxInstances)
                    numJobsToStart = Math.min(jobDef.maxInstances - numRunningJobs, numJobsToStart);

                // console.log(`LaunchReadyJobs -> numRunningJobs -> ${numRunningJobs}, notStartedJobs -> ${queryNotStartedJobs.length}, numJobsToStart -> ${numJobsToStart}, coalesce -> ${jobDef.coalesce}`);
                /// If "coalesce", skip all ready jobs except the most recent
                if ((numJobsToStart > 0) && jobDef.coalesce) {
                    for (let i = 0; i < jobsToRun.length - 1; i++) {
                        this.updateJob(_teamId, jobsToRun[i]._id, { status: Enums.JobStatus.SKIPPED, error: "Job skipped due to coalesce" });
                    }
                    const jobToRun = jobsToRun[jobsToRun.length - 1];
                    try {
                        await this.updateJob(_teamId, jobToRun._id, { status: Enums.JobStatus.RUNNING, dateStarted: new Date().toISOString() }, { status: Enums.JobStatus.NOT_STARTED });
                        await this.LaunchTasksWithNoUpstreamDependencies(_teamId, jobToRun._id, logger);
                    } catch (err) {
                        if (!(err instanceof MissingObjectError)) {
                            logger.LogError('Launching next available job', { _jobDefId: jobToRun._jobDefId.toHexString(), _jobId: jobToRun._id.toHexString() });
                        }
                    }
                    // if (resJobQuery) {
                    //     logger.LogDebug('Launching next available job', { _jobDefId: jobToRun._jobDefId.toHexString(), _jobId: jobToRun._id.toHexString() });
                    //     await this.LaunchTasksWithNoUpstreamDependencies(_teamId, jobToRun._id, logger);
                    // }
                } else {
                    /// Run up to maxInstances jobs (minus count of jobs already running) - remaining jobs will stay in "not started" status
                    for (let i = 0; i < numJobsToStart; i++) {
                        const jobToRun = jobsToRun[i];

                        try {
                            await this.updateJob(_teamId, jobToRun._id, { status: Enums.JobStatus.RUNNING, dateStarted: new Date().toISOString() }, { status: Enums.JobStatus.NOT_STARTED });
                            await this.LaunchTasksWithNoUpstreamDependencies(_teamId, jobToRun._id, logger);
                        } catch (err) {
                            if (!(err instanceof MissingObjectError)) {
                                logger.LogDebug('Launching next available job', { _jobDefId: _jobDefId.toHexString(), _jobId: jobToRun._id.toHexString() });
                            }
                        }
                        // const resJobQuery = await this.updateJob(_teamId, jobToRun._id, { status: Enums.JobStatus.RUNNING, dateStarted: new Date().toISOString() }, { status: Enums.JobStatus.NOT_STARTED });
                        // if (resJobQuery) {
                        //     logger.LogDebug('Launching next available job', { _jobDefId: _jobDefId.toHexString(), _jobId: jobToRun._id.toHexString() });
                        //     await this.LaunchTasksWithNoUpstreamDependencies(_teamId, jobToRun._id, logger);
                        // }
                    }
                }
            }
        } finally {
            try {
                await JobDefModel.findOneAndUpdate({ _teamId, _id: _jobDefId }, { launchingJobs: false }).select('_id');
                let jobNotStarted: any = JobModel.find({ _teamId, _jobDefId, status: Enums.JobStatus.NOT_STARTED }).limit(1);
                if (_.isArray(jobNotStarted) && jobNotStarted.length > 0)
                    this.LaunchReadyJobs(_teamId, _jobDefId);
            } catch (err) {
                logger.LogError('Error in LaunchReadyJobs finally block', { err, _jobDefId: _jobDefId.toHexString() });
            }
        }
    }


    async CheckJobStatus(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, currentStatus: Enums.JobStatus) {
        let taskStatuses: any = {};
        let taskIds: string[] = [];
        taskStatuses[Enums.TaskStatus.NOT_STARTED] = 0;
        taskStatuses[Enums.TaskStatus.WAITING_FOR_AGENT] = 0;
        taskStatuses[Enums.TaskStatus.PUBLISHED] = 0;
        taskStatuses[Enums.TaskStatus.RUNNING] = 0;
        taskStatuses[Enums.TaskStatus.INTERRUPTING] = 0;
        taskStatuses[Enums.TaskStatus.INTERRUPTED] = 0;
        taskStatuses[Enums.TaskStatus.CANCELING] = 0;
        taskStatuses[Enums.TaskStatus.CANCELLED] = 0;
        taskStatuses[Enums.TaskStatus.SUCCEEDED] = 0;
        taskStatuses[Enums.TaskStatus.FAILED] = 0;
        taskStatuses[Enums.TaskStatus.SKIPPED] = 0;

        const taskOutcomes = await taskOutcomeService.findTaskOutcomes(_teamId, { _jobId }, '_taskId status');
        if (_.isArray(taskOutcomes) && taskOutcomes.length > 0) {
            for (let taskOutcome of taskOutcomes) {
                taskIds.push(taskOutcome._taskId.toHexString());
                // console.log('CheckJobStatus -> taskOutcome -> ', JSON.stringify(taskOutcome, null, 4));
                if (taskOutcome.status) {
                    taskStatuses[taskOutcome.status] += 1;
                } else {
                    taskStatuses[Enums.TaskStatus.NOT_STARTED] += 1;
                }
            }
        }

        const tasks = await taskService.findTasks(_teamId, { _jobId, $or: [{ status: null }, { status: { $in: [Enums.TaskStatus.NOT_STARTED, Enums.TaskStatus.WAITING_FOR_AGENT, Enums.TaskStatus.PUBLISHED, Enums.TaskStatus.INTERRUPTED, Enums.TaskStatus.FAILED, Enums.TaskStatus.CANCELLED] } }] }, '_id status');
        if (_.isArray(tasks) && tasks.length > 0) {
            for (let task of tasks) {
                if (taskIds.indexOf(task._id.toHexString()) >= 0)
                    continue;
                if (task.status) {
                    taskStatuses[task.status] += 1;
                } else {
                    taskStatuses[Enums.TaskStatus.NOT_STARTED] += 1;
                }
            }
        }

        // console.log('CheckJobStatus -> taskStatuses -> ', JSON.stringify(taskStatuses, null, 4));
        let isJobComplete = true;
        if (taskStatuses[Enums.TaskStatus.NOT_STARTED] > 0 ||
            taskStatuses[Enums.TaskStatus.WAITING_FOR_AGENT] > 0 ||
            taskStatuses[Enums.TaskStatus.PUBLISHED] > 0 ||
            taskStatuses[Enums.TaskStatus.RUNNING] > 0 ||
            taskStatuses[Enums.TaskStatus.INTERRUPTING] > 0 ||
            taskStatuses[Enums.TaskStatus.INTERRUPTED] > 0 ||
            taskStatuses[Enums.TaskStatus.CANCELING] > 0) {
            isJobComplete = false;
        }

        if (!isJobComplete) {
            if (taskStatuses[Enums.TaskStatus.NOT_STARTED] > 0 &&
                taskStatuses[Enums.TaskStatus.WAITING_FOR_AGENT] < 1 &&
                taskStatuses[Enums.TaskStatus.PUBLISHED] < 1 &&
                taskStatuses[Enums.TaskStatus.RUNNING] < 1 &&
                taskStatuses[Enums.TaskStatus.FAILED] > 0) {
                return Enums.JobStatus.FAILED;
            } else if (currentStatus === Enums.JobStatus.INTERRUPTING &&
                taskStatuses[Enums.TaskStatus.RUNNING] === 0) {
                return Enums.JobStatus.INTERRUPTED;
            } else if (currentStatus === Enums.JobStatus.COMPLETED &&
                taskStatuses[Enums.TaskStatus.RUNNING] > 0) {
                return Enums.JobStatus.RUNNING;
            } else if (currentStatus === Enums.JobStatus.INTERRUPTED &&
                taskStatuses[Enums.TaskStatus.RUNNING] > 0) {
                return Enums.JobStatus.RUNNING;
            } else if (currentStatus === Enums.JobStatus.FAILED &&
                taskStatuses[Enums.TaskStatus.RUNNING] > 0) {
                return Enums.JobStatus.RUNNING;
            }
            return currentStatus;
        } else {
            if (taskStatuses[Enums.TaskStatus.FAILED] > 0) {
                return Enums.JobStatus.FAILED;
            }
            return Enums.JobStatus.COMPLETED;
        }

    }


    async UpdateJobStatus(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger, job: JobSchema = null, responseFields?: string) {
        if (!job) {
            if (!responseFields)
                responseFields = 'status';
            if (responseFields.indexOf('status"') < 0)
                responseFields += ' status';
            responseFields = responseFields.trim();
            const currentJobQuery: JobSchema[] = await this.findJob(_teamId, _jobId, responseFields);
            if (!currentJobQuery || (_.isArray(currentJobQuery) && currentJobQuery.length === 0))
                throw new MissingObjectError(`Job '${_jobId.toHexString()}' not found for team '${_teamId.toHexString()}'`);
            job = currentJobQuery[0];
        }

        const status = await this.CheckJobStatus(_teamId, _jobId, job.status);
        // console.log('JobService -> UpdateJobStatus -> status -> ', status, ', job.status -> ', job.status);
        if (status != job.status) {
            let update = {};
            update['status'] = status;
            if (status >= Enums.JobStatus.COMPLETED && job.status < Enums.JobStatus.COMPLETED)
                update['dateCompleted'] = new Date().toISOString();
            const jobUpdateQuery: any = (<JobSchema>await this.updateJob(_teamId, _jobId, update));
            if (_.isArray(jobUpdateQuery) && jobUpdateQuery.length > 0) {
                const jobUpdated: JobSchema = jobUpdateQuery[0];
                job = jobUpdated;
                if (jobUpdated.status >= Enums.JobStatus.COMPLETED && (jobUpdated.onJobCompleteAlertEmail || jobUpdated.onJobCompleteAlertSlackURL)) {
                    await SGUtils.OnJobComplete(_teamId, jobUpdated, logger);
                }
            }
            // console.log('JobService -> UpdateJobStatus -> job -> ', JSON.stringify(job, null, 4));

            const deltas = Object.assign({ _id: _jobId }, update);
            await rabbitMQPublisher.publish(_teamId, "Job", null, PayloadOperation.UPDATE, convertData(JobSchema, deltas));
        }

        return job;
    }


    async LaunchTasksWithNoUpstreamDependencies(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger) {
        const currentJobQuery: JobSchema[] = await this.findJob(_teamId, _jobId, 'status _jobDefId');
        if (!currentJobQuery || (_.isArray(currentJobQuery) && currentJobQuery.length === 0))
            throw new MissingObjectError(`Job '${_jobId.toHexString()}" not found for team "${_teamId.toHexString()}'`);
        const currentJob: JobSchema = currentJobQuery[0];
        // console.log('JobService -> LaunchTasksWithNoUpstreamDependencies -> job -> ', JSON.stringify(currentJob, null, 4));

        // await FreeTierChecks.MaxScriptsCheck(_teamId);

        let no_tasks_to_run: boolean = true;
        const tasks = await taskService.findAllJobTasks(_teamId, _jobId);
        // console.log('JobService -> LaunchTasksWithNoUpstreamDependencies -> tasks -> ', JSON.stringify(tasks, null, 4));
        const tasksToRoutes = SGUtils.flatMap(x => x, tasks.map((t) => SGUtils.flatMap(x => x[0], t.toRoutes)));
        // console.log('JobService -> LaunchTasksWithNoUpstreamDependencies -> tasksFromToRoutes -> ', JSON.stringify(tasksToRoutes, null, 4));
        for (let task of tasks) {
            try {
                if ((!task.up_dep || (Object.keys(task.up_dep).length < 1)) && (tasksToRoutes.indexOf(task.name) < 0)) {
                    if (task.status == null) {
                        try {
                            task.status = Enums.TaskStatus.NOT_STARTED;
                            await taskService.updateTask(_teamId, task._id, { status: task.status }, logger, { status: null }, null, null);
                        } catch (err) {
                            if (err instanceof MissingObjectError) {
                                logger.LogWarning(err.message, { error: err, service: 'JobService', method: 'LaunchTasksWithNoUpstreamDependencies' });
                            } else {
                                throw err;
                            }
                        }

                        let publishRes = await taskOutcomeService.PublishTask(_teamId, task, logger, amqp);
                        // console.log('LaunchReadyTasks -> publishRes -> ', publishRes);
                        if (publishRes.success) {
                            // PublishTask was successful
                            // task.status = Enums.TaskStatus.PUBLISHED;
                            // await taskService.updateTask(_teamId, task._id, { status: task.status, route: '' }, logger)
                            no_tasks_to_run = false;
                        }
                    }
                }
            } catch (e) {
                logger.LogError(e, { Class: 'JobRouter', Method: 'LaunchTasksWithNoUpstreamDependencies', _teamId, _jobId, task });
            }
        }

        if (no_tasks_to_run) {
            logger.LogError(`No tasks to run`, { Class: 'JobService', Method: 'LaunchTasksWithNoUpstreamDependencies', _teamId, _jobId });
            await this.UpdateJobStatus(_teamId, _jobId, logger, currentJob);
            // await this.updateJob(_teamId, _jobId, { status: Enums.JobStatus.COMPLETED, dateCompleted: new Date().toISOString() });
            this.LaunchReadyJobs(_teamId, currentJob._jobDefId);
        }
    }
}

export const jobService = new JobService();