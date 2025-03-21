import { convertData } from '../utils/ResponseConverters';
import { JobDefSchema, JobDefModel } from '../domain/JobDef';
import { ScriptSchema } from '../domain/Script';
import { StepDefSchema } from '../domain/StepDef';
import { TaskDefSchema } from '../domain/TaskDef';
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
import * as Enums from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';
import { AMQPConnector } from '../../shared/AMQPLib';

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

    public async findJobDef(
        _teamId: mongodb.ObjectId,
        jobDefId: mongodb.ObjectId,
        responseFields?: string
    ): Promise<JobDefSchema | null> {
        const result: JobDefSchema[] = await JobDefModel.findById(jobDefId).find({ _teamId }).select(responseFields);
        if (_.isArray(result) && result.length > 0) return result[0];
        return null;
    }

    public async createJobDefInternal(data: any): Promise<object> {
        const model = new JobDefModel(data);
        const newJobDef = await model.save();
        return newJobDef;
    }

    public async createJobDef(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<JobDefSchema> {
        const existingJobDefQuery: any = await this.findAllJobDefsInternal({ _teamId, name: data.name });
        if (_.isArray(existingJobDefQuery) && existingJobDefQuery.length > 0)
            throw new ValidationError(`Job definition with name "${data.name}" already exists`);

        data._teamId = _teamId;
        const jobDefModel = new JobDefModel(data);
        const newJobDef = await jobDefModel.save();

        await rabbitMQPublisher.publish(
            _teamId,
            'JobDef',
            correlationId,
            PayloadOperation.CREATE,
            convertData(JobDefSchema, newJobDef)
        );

        return this.findJobDef(_teamId, newJobDef._id, responseFields);
    }

    public async createJobDefFromJobDef(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<JobDefSchema> {
        data._teamId = _teamId;

        if (!data._jobDefId) throw new ValidationError('Request body missing "_jobDefId"');

        if (!data.createdBy) throw new ValidationError('Request body missing "createdBy"');

        const jobDefSource = await this.findJobDef(_teamId, new mongodb.ObjectId(data._jobDefId));
        if (!jobDefSource) throw new MissingObjectError(`JobDef ${data._jobDefId} not found.`);

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
            onJobTaskInterruptedAlertSlackURL: jobDefSource.onJobTaskInterruptedAlertSlackURL,
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
            };

            const newTaskDef: TaskDefSchema = await taskDefService.createTaskDef(
                _teamId,
                taskDef_data,
                correlationId,
                '_id'
            );

            if (taskDefSource.target != TaskDefTarget.AWS_LAMBDA) {
                let stepDefsSourceQuery: StepDefSchema[] = await stepDefService.findTaskDefStepDefs(
                    _teamId,
                    taskDefSource._id
                );
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
                    };

                    await stepDefService.createStepDef(_teamId, stepDef_data, correlationId, '_id');
                }
            }
        }

        await rabbitMQPublisher.publish(
            _teamId,
            'JobDef',
            correlationId,
            PayloadOperation.CREATE,
            convertData(JobDefSchema, newJobDef)
        );

        return this.findJobDef(_teamId, newJobDef._id, responseFields);
    }

    public async createJobDefFromScript(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<JobDefSchema> {
        data._teamId = _teamId;

        if (!data._scriptId) throw new ValidationError('Request body missing "_scriptId"');

        if (!data.createdBy) throw new ValidationError('Request body missing "createdBy"');

        const script: ScriptSchema = await scriptService.findScript(
            _teamId,
            new mongodb.ObjectId(data._scriptId),
            '_id name'
        );
        if (!script) throw new MissingObjectError(`Script ${data._scriptId} not found.`);

        const jobDef_data = {
            _teamId,
            name: `${script.name} job`,
            createdBy: data.createdBy,
        };
        const jobDefModel = new JobDefModel(jobDef_data);
        const newJobDef = await jobDefModel.save();

        const taskDef_data = {
            _teamId,
            _jobDefId: newJobDef._id,
            target: TaskDefTarget.SINGLE_AGENT,
            name: 'task',
        };
        const taskDef: TaskDefSchema = await taskDefService.createTaskDef(_teamId, taskDef_data, correlationId, '_id');

        const stepDef_data = {
            _teamId,
            _taskDefId: taskDef._id,
            name: 'step',
            _scriptId: script._id,
            order: 1,
        };
        await stepDefService.createStepDef(_teamId, stepDef_data, correlationId, '_id');

        await rabbitMQPublisher.publish(
            _teamId,
            'JobDef',
            correlationId,
            PayloadOperation.CREATE,
            convertData(JobDefSchema, newJobDef)
        );

        return this.findJobDef(_teamId, newJobDef._id, responseFields);
    }

    public async createJobDefFromWindowsTask(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<JobDefSchema> {
        data._teamId = _teamId;

        if (!data.winTask) throw new ValidationError('Missing "winTask"');

        if (!data._agentId) throw new ValidationError('Missing "_agentId"');

        if (!data.createdBy) throw new ValidationError('Missing "createdBy"');

        const agent = await agentService.findAgent(
            _teamId,
            new mongodb.ObjectId(data._agentId),
            '_id machineId timezone'
        );
        if (!agent) throw new MissingObjectError(`Agent ${data._agentId} not found.`);

        const windowsTaskJobUniqueId = SGUtils.makeid(5);

        const jobDef_data = {
            _teamId,
            name: `Windows Task Job ${agent.machineId} - ${windowsTaskJobUniqueId}`,
            createdBy: data.createdBy,
        };
        const jobDefModel = new JobDefModel(jobDef_data);
        const newJobDef = await jobDefModel.save();

        const action = data.winTask.Task.Actions.Exec;
        const code = SGUtils.btoa(action['Command']);
        const script_data = {
            _teamId,
            name: `win-task-${agent.machineId}-${windowsTaskJobUniqueId}`,
            scriptType: ScriptType.SH,
            code: code,
            shadowCopyCode: code,
            teamEditable: true,
        };
        const script: ScriptSchema = await scriptService.createScript(
            _teamId,
            script_data,
            data.createdBy,
            correlationId,
            '_id'
        );

        const workingDirectory = action['WorkingDirectory'] || '';
        const taskDef_data = {
            _teamId,
            _jobDefId: newJobDef._id,
            target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
            name: 'task',
            targetAgentId: agent._id.toHexString(),
            workingDirectory,
        };
        const taskDef: TaskDefSchema = await taskDefService.createTaskDef(_teamId, taskDef_data, correlationId, '_id');

        const scriptArgs = '' || action['Arguments'];
        const stepDef_data = {
            _teamId,
            _taskDefId: taskDef._id,
            name: 'step',
            _scriptId: script._id,
            order: 1,
            arguments: scriptArgs,
        };
        await stepDefService.createStepDef(_teamId, stepDef_data, correlationId, '_id');

        await scheduleService.createSchedulesFromWindowsTask(
            _teamId,
            newJobDef._id,
            data.winTask,
            data.createdBy,
            agent.timezone,
            correlationId
        );

        await rabbitMQPublisher.publish(
            _teamId,
            'JobDef',
            correlationId,
            PayloadOperation.CREATE,
            convertData(JobDefSchema, newJobDef)
        );

        return this.findJobDef(_teamId, newJobDef._id, responseFields);
    }

    public async createJobDefFromCron(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId: string,
        responseFields?: string
    ): Promise<JobDefSchema> {
        data._teamId = _teamId;

        if (!data.cronString) throw new ValidationError('Missing "cronString"');

        if (!data._agentId) throw new ValidationError('Missing "_agentId"');

        if (!data.createdBy) throw new ValidationError('Missing "createdBy"');

        const agent = await agentService.findAgent(
            _teamId,
            new mongodb.ObjectId(data._agentId),
            '_id machineId timezone'
        );
        if (!agent) throw new MissingObjectError(`Agent ${data._agentId} not found.`);

        const cronJobUniqueId = SGUtils.makeid(5);

        const jobDef_data = {
            _teamId,
            name: `Cron Job ${agent.machineId} - ${cronJobUniqueId}`,
            createdBy: data.createdBy,
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
            teamEditable: true,
        };
        const script: ScriptSchema = await scriptService.createScript(
            _teamId,
            script_data,
            data.createdBy,
            correlationId,
            '_id'
        );

        const taskDef_data = {
            _teamId,
            _jobDefId: newJobDef._id,
            target: TaskDefTarget.SINGLE_SPECIFIC_AGENT,
            name: 'task',
            targetAgentId: agent._id.toHexString(),
        };
        const taskDef: TaskDefSchema = await taskDefService.createTaskDef(_teamId, taskDef_data, correlationId, '_id');

        const stepDef_data = {
            _teamId,
            _taskDefId: taskDef._id,
            name: 'step',
            _scriptId: script._id,
            variables: data.envVars,
            order: 1,
        };
        await stepDefService.createStepDef(_teamId, stepDef_data, correlationId, '_id');

        await rabbitMQPublisher.publish(
            _teamId,
            'JobDef',
            correlationId,
            PayloadOperation.CREATE,
            convertData(JobDefSchema, newJobDef)
        );

        let day_of_week: string = '';
        if (tokens[4] != '*') day_of_week = tokens[4];
        let month: string = '';
        if (tokens[3] != '*') month = tokens[3];
        let day: string = '';
        if (tokens[2] != '*') day = tokens[2];
        let hour: string = '';
        if (tokens[1] != '*') hour = tokens[1];
        let minute: string = '';
        if (tokens[0] != '*') minute = tokens[0];

        const schedule_data: any = {
            _teamId,
            _jobDefId: newJobDef._id,
            name: 'Schedule from Cron',
            createdBy: data.createdBy,
            lastUpdatedBy: data.createdBy,
            isActive: true,
            TriggerType: 'cron',
            cron: {
                Day_Of_Week: day_of_week,
                Month: month,
                Day: day,
                Hour: hour,
                Minute: minute,
            },
            FunctionKwargs: {
                _teamId,
                targetId: newJobDef._id,
            },
        };
        if (agent.timezone) schedule_data.cron.Timezone = agent.timezone;
        await scheduleService.createSchedule(_teamId, schedule_data, correlationId, '_id');

        return this.findJobDef(_teamId, newJobDef._id, responseFields);
    }

    public async updateJobDef(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        logger: BaseLogger,
        amqp: AMQPConnector,
        filter?: any,
        correlationId?: string,
        userEmail?: string,
        responseFields?: string
    ): Promise<JobDefSchema> {
        if (data.name) {
            const existingJobDefQuery: any = await this.findAllJobDefsInternal({ _teamId, name: data.name });
            if (_.isArray(existingJobDefQuery) && existingJobDefQuery.length > 0)
                if (existingJobDefQuery[0]._id.toHexString() != id.toHexString())
                    throw new ValidationError(`Job definition with name "${data.name}" already exists`);
        }

        const defaultFilter = { _id: id, _teamId };
        if (filter) filter = Object.assign(defaultFilter, filter);
        else filter = defaultFilter;

        // don't allow updating the currentVersion manually
        delete data.lastRunId;

        const jobDef = await JobDefModel.findOneAndUpdate(filter, data);

        if (!jobDef) throw new MissingObjectError(`Job template with id '${id}' not found.`);

        if (data.status == JobDefStatus.RUNNING && jobDef.status == JobDefStatus.PAUSED)
            await jobService.LaunchReadyJobs(_teamId, id, logger, amqp);

        if (data.maxInstances) {
            const maxInstancesNew = parseInt(data.maxInstances);
            if (maxInstancesNew > jobDef.maxInstances) await jobService.LaunchReadyJobs(_teamId, id, logger, amqp);
        }

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(JobDefSchema, deltas);
        await rabbitMQPublisher.publish(
            _teamId,
            'JobDef',
            correlationId,
            PayloadOperation.UPDATE,
            convertedDeltas,
            userEmail
        );

        return this.findJobDef(_teamId, id, responseFields);
    }

    public async deleteJobDef(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        correlationId?: string
    ): Promise<object> {
        const deleted = await JobDefModel.deleteOne({ _id: id });

        await rabbitMQPublisher.publish(_teamId, 'JobDef', correlationId, PayloadOperation.DELETE, {
            id,
            correlationId,
        });

        return deleted;
    }

    public async serializeExportedJobDefs(_teamId: mongodb.ObjectId, jobDefs: JobDefSchema[]): Promise<any> {
        const results = { jobDefs: [], scripts: [] };

        const uniqueScripts = {};

        for (let jobDefCount = 0; jobDefCount < jobDefs.length; jobDefCount++) {
            const jobDef = jobDefs[jobDefCount];

            const jobDefJson: any = {
                version: '0.0',
                name: jobDef.name,
                maxInstances: jobDef.maxInstances,
                misFireGraceTime: jobDef.misfireGraceTime,
                coalesce: jobDef.coalesce,
                pauseOnJobFail: jobDef.pauseOnFailedJob,
                runtimeVars: {},
                schedules: [],
                taskDefs: [],
            };

            if (jobDef.runtimeVars) {
                for (let runtimeVar of Object.keys(jobDef.runtimeVars)) {
                    jobDefJson.runtimeVars[runtimeVar] = { value: '*', sensitive: false };
                }
            }

            // get the schedule
            const schedules: any = await scheduleService.findAllSchedulesInternal({ _teamId, _jobDefId: jobDef._id });

            for (let scheduleIndex = 0; scheduleIndex < schedules.length; scheduleIndex++) {
                const schedule = schedules[scheduleIndex];
                const scheduleJson: any = {
                    TriggerType: schedule.TriggerType,
                    name: schedule.name,
                    isActive: schedule.isActive,
                    misfire_grace_time: schedule.misfire_grace_time,
                    coalesce: schedule.coalesce,
                    max_instances: schedule.max_instances,
                    RunDate: schedule.RunDate,
                    runtimeVars: schedule.FunctionKwargs.runtimeVars || {},
                };

                if (schedule.cron) {
                    scheduleJson.cron = schedule.cron;
                }

                if (schedule.interval) {
                    scheduleJson.interval = schedule.interval;
                }

                jobDefJson.schedules.push(scheduleJson);
            }

            // get all tasks, steps and scripts
            const taskDefs = await taskDefService.findAllTaskDefsInternal({ _teamId, _jobDefId: jobDef._id });

            for (let taskDefCount = 0; taskDefCount < taskDefs.length; taskDefCount++) {
                const taskDef = taskDefs[taskDefCount];
                const taskDefJSON: any = {
                    target: taskDef.target,
                    name: taskDef.name,
                    order: taskDef.order,
                    requiredTags: taskDef.requiredTags,
                    fromRoutes: taskDef.fromRoutes,
                    toRoutes: taskDef.toRoutes,
                    expectedValues: taskDef.expectedValues,
                    autoRestart: taskDef.autoRestart,
                    stepDefs: [],
                    exportWarnings: [],
                };

                if (taskDef.artifacts) {
                    // todo - add an export warning for each artifact
                }

                if (taskDef.targetAgentId) {
                    // todo - add an export warning for the agent
                }

                // get all steps for the task
                const stepDefs = await stepDefService.findAllStepDefsInternal({ _teamId, _taskDefId: taskDef._id });

                for (let stepDefCount = 0; stepDefCount < stepDefs.length; stepDefCount++) {
                    const stepDef = stepDefs[stepDefCount];
                    const stepDefJSON: any = {
                        name: stepDef.name,
                        order: stepDef.order,
                        command: stepDef.command,
                        arguments: stepDef.arguments,
                        variables: stepDef.variables,

                        lambdaCodeSource: stepDef.lambdaCodeSource,

                        lambdaRuntime: stepDef.lambdaRuntime,
                        lambdaMemorySize: stepDef.lambdaMemorySize,
                        lambdaTimeout: stepDef.lambdaTimeout,
                        lambdaFunctionHandler: stepDef.lambdaFunctionHandler,
                        lambdaAWSRegion: stepDef.lambdaAWSRegion,
                        lambdaDependencies: stepDef.lambdaDependencies,

                        lambdaZipfile: stepDef.lambdaZipfile, // todo - this is an artifact :(
                    };

                    // assemble all of the scripts in a unique root level collection
                    if (stepDef._scriptId) {
                        const scripts = await scriptService.findAllScriptsInternal({ _teamId, _id: stepDef._scriptId });

                        if (scripts.length > 0) {
                            if (scripts.length > 1) {
                                console.warn('Warning, found multiple scripts for step' + stepDef.name);
                            }

                            // pick the first one
                            const script = scripts[0];

                            stepDefJSON.scriptName = script.name;

                            if (uniqueScripts[script.name] === undefined) {
                                uniqueScripts[script.name] = script;
                            }
                        }
                    }

                    taskDefJSON.stepDefs.push(stepDefJSON);
                }

                jobDefJson.taskDefs.push(taskDefJSON);
            }

            results.jobDefs.push(jobDefJson);
        }

        // Now you need to recusively drill down through all of the script.sgsElems to find all of the
        // scripts that are indirectly referenced
        const scriptNamesToCheck = Object.keys(uniqueScripts);

        while (scriptNamesToCheck.length > 0) {
            const scriptName = scriptNamesToCheck.pop();

            if (uniqueScripts[scriptName] === undefined) {
                const scripts = await scriptService.findAllScriptsInternal({ _teamId, name: scriptName });

                if (scripts.length > 0) {
                    if (scripts.length > 1) {
                        console.warn(`Warning, found multiple scripts with name "${scriptName}"`);
                    }

                    uniqueScripts[scriptName] = scripts[0];
                } else {
                    console.error(`Error, unable to find referenced script with name "${scriptName}"`);
                }
            }

            // The script might have been referenced by @sgs but it didn't exist.
            if (uniqueScripts[scriptName] !== undefined) {
                const uniqueScript = uniqueScripts[scriptName];

                if (uniqueScript.sgsElems) {
                    for (let sgsScriptName of uniqueScript.sgsElems) {
                        // If you haven't loaded the uniqueScripts yet, put it in the scriptNamesToCheck and it will
                        // be loaded immediately in the uniqueScripts in the loop above
                        if (uniqueScripts[sgsScriptName] === undefined) {
                            scriptNamesToCheck.push(sgsScriptName);
                        }
                    }
                }
            }
        }

        // Now assemble all of the unique script information
        for (let scriptName in uniqueScripts) {
            const script = uniqueScripts[scriptName];
            const scriptJSON = {
                name: script.name,
                scriptType: script.scriptType,
                code: script.code,
                teamUsable: script.teamUsable,
                teamEditable: script.teamEditable,
                isActive: script.isActive,
            };

            results.scripts.push(scriptJSON);
        }

        // Todo - you need to eventually handle the artifacts.  This is very difficult due to the sizes
        // of the files. If the download file is too large the client > server download will always
        // timeout.

        return results;
    }

    // Initially this function won't return anything - it relies on browser push to send through all the created scripts,
    // job defs, task defs and step defs.
    public async importJobDefs(
        _teamId: mongodb.ObjectId,
        userId: mongodb.ObjectId,
        correlationId: string,
        dataJSON: any
    ): Promise<any> {
        const report = []; // todo - this ain't great

        // todo - possibly wrap each script / jobdef create inside of a try catch so you can partially fail / succeed.  ugh

        // First import the scripts.  Reuse existing scripts that have the same name + code
        const scriptsJSON = dataJSON.scripts;
        const scriptIdsByOriginalName = {};

        for (let scriptCount = 0; scriptCount < scriptsJSON.length; scriptCount++) {
            const scriptJSON = scriptsJSON[scriptCount];
            let scriptWithSameNameFound = false;
            let script;

            // Try to reuse existing scripts
            const scripts = await scriptService.findAllScriptsInternal({ _teamId, name: scriptJSON.name });

            if (scripts.length > 0) {
                scriptWithSameNameFound = true;
                if (scripts[0].code === scriptJSON.code) {
                    script = scripts[0];
                }
            }

            if (!script) {
                let newScriptName = scriptJSON.name;

                if (scriptWithSameNameFound) {
                    // generate a unique script name from what's found in the db for the team
                    const nameRegex = new RegExp('^' + scriptJSON.name + '_import_\\d+$');
                    const existingScripts = await scriptService.findAllScriptsInternal(
                        { _teamId, name: { $regex: nameRegex } },
                        '_id name'
                    );

                    // convert to names to a map for quick lookup
                    const existingNames = {};
                    for (let existing of existingScripts) {
                        existingNames[existing.name] = true;
                    }

                    for (let i = 1; i < 100; i++) {
                        newScriptName = scriptJSON.name + '_import_' + i;
                        if (existingNames[newScriptName] === undefined) {
                            break; // now newScriptName is unique
                        }
                    }
                }

                // create the new script
                const newScriptData = {
                    name: newScriptName,
                    scriptType: scriptJSON.scriptType,
                    code: scriptJSON.code,
                    teamUsable: scriptJSON.teamUsable,
                    teamEditable: scriptJSON.teamEditable,
                    isActive: scriptJSON.isActive,
                };

                const createdScript: ScriptSchema = await scriptService.createScript(
                    _teamId,
                    newScriptData,
                    userId,
                    correlationId
                );

                scriptIdsByOriginalName[scriptJSON.name] = createdScript._id;

                if (scriptWithSameNameFound) {
                    report.push(`Created script ${scriptJSON.name} with new name of ${newScriptName}`);
                } else {
                    report.push(`Created script ${scriptJSON.name}`);
                }
            } else {
                scriptIdsByOriginalName[scriptJSON.name] = script._id;
            }
        }

        // After importing the scripts you need to JobDefs / StepDefs and TaskDefs -> Script
        const jobDefsJSON = dataJSON.jobDefs;

        for (let jobDefCount = 0; jobDefCount < jobDefsJSON.length; jobDefCount++) {
            const jobDefJSON = jobDefsJSON[jobDefCount];
            let newJobDefName = jobDefJSON.name;

            // Check if that job name already exists.  If it does, find a new name
            // JobDef.name is case sensitive
            const jobDefs = await jobDefService.findAllJobDefsInternal({ _teamId, name: jobDefJSON.name });

            if (jobDefs.length > 0) {
                // generate a unique job def name from what's found in the db for the team
                const nameRegex = new RegExp('^' + jobDefJSON.name + '_import_\\d+$');
                const existingJobDefs = await jobDefService.findAllJobDefsInternal(
                    { _teamId, name: { $regex: nameRegex } },
                    '_id name'
                );

                // convert to names to a map for quick lookup
                const existingNames = {};
                for (let existing of existingJobDefs) {
                    existingNames[existing.name] = true;
                }

                for (let i = 1; i < 100; i++) {
                    newJobDefName = jobDefJSON.name + '_import_' + i;
                    if (existingNames[newJobDefName] === undefined) {
                        break; // now newJobDefName is unique and we can create a new job with the name
                    }
                }
            }

            // now that the name is unique (case senstive) you can create the new job def
            // create the new script
            const newJobDefData: any = {
                name: newJobDefName,
                createdBy: userId,
                version: '0.0',
                maxInstances: jobDefJSON.maxInstances,
                misFireGraceTime: jobDefJSON.misfireGraceTime,
                coalesce: jobDefJSON.coalesce,
                pauseOnJobFail: jobDefJSON.pauseOnFailedJob,
                runtimeVars: jobDefJSON.runtimeVars,
            };

            const createdJobDef: JobDefSchema = await jobDefService.createJobDef(_teamId, newJobDefData, correlationId);

            // now create the schedules for the new jobDef
            for (let scheduleIndex = 0; scheduleIndex < jobDefJSON.schedules.length; scheduleIndex++) {
                const scheduleJSON = jobDefJSON.schedules[scheduleIndex];

                let scheduleRuntimeVars: any = {};
                if (scheduleJSON.runtimeVars) scheduleRuntimeVars = scheduleJSON.runtimeVars;

                const newScheduleData: any = {
                    _jobDefId: createdJobDef._id,
                    createdBy: userId,
                    lastUpdatedBy: userId,
                    TriggerType: scheduleJSON.TriggerType,
                    name: scheduleJSON.name,
                    isActive: scheduleJSON.isActive,
                    misfire_grace_time: scheduleJSON.misfire_grace_time,
                    coalesce: scheduleJSON.coalesce,
                    max_instances: scheduleJSON.max_instances,
                    RunDate: scheduleJSON.RunDate,
                    FunctionKwargs: {
                        _teamId,
                        targetId: createdJobDef._id,
                        runtimeVars: scheduleRuntimeVars,
                    },
                };

                if (scheduleJSON.cron) {
                    newScheduleData.cron = scheduleJSON.cron;
                }

                if (scheduleJSON.interval) {
                    newScheduleData.interval = scheduleJSON.interval;
                }

                await scheduleService.createSchedule(_teamId, newScheduleData, correlationId);
            }

            // now create the task defs
            for (let taskDefCount = 0; taskDefCount < jobDefJSON.taskDefs.length; taskDefCount++) {
                const taskDefJSON = jobDefJSON.taskDefs[taskDefCount];

                const newTaskDefData = {
                    _jobDefId: createdJobDef._id,
                    target: taskDefJSON.target,
                    name: taskDefJSON.name,
                    order: taskDefJSON.order,
                    requiredTags: taskDefJSON.requiredTags,
                    fromRoutes: taskDefJSON.fromRoutes,
                    toRoutes: taskDefJSON.toRoutes,
                    expectedValues: taskDefJSON.expectedValues,
                    autoRestart: taskDefJSON.autoRestart,
                    exportWarnings: [],
                };

                const createdTaskDef: TaskDefSchema = await taskDefService.createTaskDef(
                    _teamId,
                    newTaskDefData,
                    correlationId
                );

                // For AWS Lambda tasks the step def was automatically created so you have to find it and update it :(
                if (taskDefJSON.target == Enums.TaskDefTarget.AWS_LAMBDA) {
                    if (taskDefJSON.stepDefs.length < 1) {
                        console.error(
                            `Error, for some reason the importer was passed an aws lambda task without a step def`
                        );
                    } else {
                        const stepDefJSON = taskDefJSON.stepDefs[0];

                        // First locate the lambda step
                        const stepDefs = await stepDefService.findAllStepDefsInternal({
                            _taskDefId: createdTaskDef._id,
                        });

                        if (stepDefs.length > 0) {
                            const stepDef = stepDefs[0];

                            const newStepDefData: any = {
                                name: stepDefJSON.name,
                                order: stepDefJSON.order,
                                command: stepDefJSON.command,
                                arguments: stepDefJSON.arguments,
                                variables: stepDefJSON.variables,

                                lambdaCodeSource: stepDefJSON.lambdaCodeSource,

                                lambdaRuntime: stepDefJSON.lambdaRuntime,
                                lambdaMemorySize: stepDefJSON.lambdaMemorySize,
                                lambdaTimeout: stepDefJSON.lambdaTimeout,
                                lambdaFunctionHandler: stepDefJSON.lambdaFunctionHandler,
                                lambdaAWSRegion: stepDefJSON.lambdaAWSRegion,
                                lambdaDependencies: stepDefJSON.lambdaDependencies,

                                lambdaZipfile: stepDefJSON.lambdaZipfile, // todo - this won't work right now across teams coz artifacts and blah blah blah
                            };

                            // Link the step def to the script by import name if it exists
                            if (stepDefJSON.scriptName) {
                                if (scriptIdsByOriginalName[stepDefJSON.scriptName]) {
                                    newStepDefData._scriptId = scriptIdsByOriginalName[stepDefJSON.scriptName];
                                } else {
                                    console.error(
                                        `Error, when importing a lambda stepDef that referenced script name "${stepDefJSON.scriptName}" the script was not found on import!!`
                                    );
                                }
                            }

                            await stepDefService.updateStepDef(_teamId, stepDef._id, newStepDefData, correlationId);
                        } else {
                            // todo - better error handling here
                            console.error(
                                `Error, Unable to locate the AWS Lambda step def on import for task def id ${createdTaskDef._id}`
                            );
                        }
                    }
                } else {
                    // now create the step defs per task def for non-lambda task defs
                    for (let stepDefCount = 0; stepDefCount < taskDefJSON.stepDefs.length; stepDefCount++) {
                        const stepDefJSON = taskDefJSON.stepDefs[stepDefCount];

                        const newStepDefData: any = {
                            _taskDefId: createdTaskDef._id,

                            name: stepDefJSON.name,
                            order: stepDefJSON.order,
                            command: stepDefJSON.command,
                            arguments: stepDefJSON.arguments,
                            variables: stepDefJSON.variables,

                            // I don't think lambda properties matter for a non-lamda task def / step def so just ignore them
                        };

                        // Link the step def to the script by import name if it exists
                        if (stepDefJSON.scriptName) {
                            if (scriptIdsByOriginalName[stepDefJSON.scriptName]) {
                                newStepDefData._scriptId = scriptIdsByOriginalName[stepDefJSON.scriptName];
                            } else {
                                console.error(
                                    `Error, when importing a stepDef that referenced script name "${stepDefJSON.scriptName}" the script was not found on import!!`
                                );
                            }
                        }

                        await stepDefService.createStepDef(_teamId, newStepDefData, correlationId);
                    }
                }
            }

            if (jobDefJSON.name !== newJobDefName) {
                report.push(`Created job ${jobDefJSON.name} with new name of ${newJobDefName}`);
            } else {
                report.push(`Created job ${jobDefJSON.name}`);
            }
        }

        return report;
    }
}

export const jobDefService = new JobDefService();
