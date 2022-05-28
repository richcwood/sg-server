import { convertData } from '../utils/ResponseConverters';
import { taskOutcomeService } from './TaskOutcomeService';
import { taskOutcomeActionService } from './TaskOutcomeActionService';
import { TaskStatus, JobStatus, TaskFailureCode, JobDefStatus } from '../../shared/Enums';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import { BaseLogger } from '../../shared/SGLogger';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { ValidationError } from '../utils/Errors';
import { JobSchema, JobModel } from '../domain/Job';
import { jobService } from './JobService';
import { taskService } from './TaskService';
import { AMQPConnector } from '../../shared/AMQPLib';


export class JobActionService {

    private async interruptJobTasks(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger) {
        let tasksToInterruptFilter = {};
        tasksToInterruptFilter['_jobId'] = _jobId;
        tasksToInterruptFilter['status'] = TaskStatus.WAITING_FOR_AGENT;
        const tasksToInterruptQuery = await taskService.findAllTasksInternal(tasksToInterruptFilter, '_id');

        if (_.isArray(tasksToInterruptQuery) && tasksToInterruptQuery.length > 0) {
            for (let i = 0; i < tasksToInterruptQuery.length; i++) {
                const taskToInterrupt = tasksToInterruptQuery[i];
                try {
                    await taskService.updateTask(_teamId, taskToInterrupt._id, { status: null, failureCode: '' }, logger);
                } catch (e) {
                    logger.LogWarning(`Error canceling job task: ${e}`, { taskToInterrupt });
                }
            }
        }

        let taskOutcomesToInterruptFilter = {};
        taskOutcomesToInterruptFilter['_jobId'] = _jobId;
        taskOutcomesToInterruptFilter['status'] = { $lt: TaskStatus.CANCELING };
        const taskOutcomesToInterruptQuery = await taskOutcomeService.findAllTaskOutcomesInternal(taskOutcomesToInterruptFilter, '_id');

        if (_.isArray(taskOutcomesToInterruptQuery) && taskOutcomesToInterruptQuery.length > 0) {
            for (let i = 0; i < taskOutcomesToInterruptQuery.length; i++) {
                const taskOutcomeToInterrupt = taskOutcomesToInterruptQuery[i];
                try {
                    await taskOutcomeActionService.interruptTaskOutcome(_teamId, taskOutcomeToInterrupt._id);
                } catch (e) {
                    logger.LogWarning(`Error interrupting job task: ${e}`, { taskOutcomeToInterrupt });
                }
            }
        }
    }


    private async cancelJobTasks(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger) {
        let tasksToCancelFilter = {};
        tasksToCancelFilter['_jobId'] = _jobId;
        const tasksToCancelQuery = await taskService.findAllTasksInternal(tasksToCancelFilter, '_id');

        if (_.isArray(tasksToCancelQuery) && tasksToCancelQuery.length > 0) {
            for (let i = 0; i < tasksToCancelQuery.length; i++) {
                const taskToCancel = tasksToCancelQuery[i];
                try {
                    await taskService.updateTask(_teamId, taskToCancel._id, { status: TaskStatus.CANCELLED }, logger);
                } catch (e) {
                    logger.LogWarning(`Error canceling job task: ${e}`, { taskToCancel });
                }
            }
        }

        let taskOutcomesToCancelFilter = {};
        taskOutcomesToCancelFilter['_jobId'] = _jobId;
        taskOutcomesToCancelFilter['$or'] = [{ status: { $lt: TaskStatus.CANCELING } }, { status: TaskStatus.FAILED }];
        const taskOutcomesToCancelQuery = await taskOutcomeService.findAllTaskOutcomesInternal(taskOutcomesToCancelFilter, '_id');

        if (_.isArray(taskOutcomesToCancelQuery) && taskOutcomesToCancelQuery.length > 0) {
            for (let i = 0; i < taskOutcomesToCancelQuery.length; i++) {
                const taskOutcomeToCancel = taskOutcomesToCancelQuery[i];
                try {
                    await taskOutcomeActionService.cancelTaskOutcome(_teamId, taskOutcomeToCancel._id);
                } catch (e) {
                    logger.LogWarning(`Error canceling job task outcome: ${e}`, { taskOutcomeToCancel });
                }
            }
        }
    }


    private async restartJobTasks(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger, amqp: AMQPConnector) {
        let tasksRestarted = [];
        let taskOutcomesToRestartFilter = {};
        taskOutcomesToRestartFilter['_jobId'] = _jobId;
        taskOutcomesToRestartFilter['$or'] = [{ status: TaskStatus.INTERRUPTED }, { $and: [{ status: TaskStatus.FAILED }, { $or: [{ failureCode: TaskFailureCode.AGENT_EXEC_ERROR }, { failureCode: TaskFailureCode.LAUNCH_TASK_ERROR }, { failureCode: TaskFailureCode.TASK_EXEC_ERROR }] }] }];
        const taskOutcomesToRestartQuery = await taskOutcomeService.findAllTaskOutcomesInternal(taskOutcomesToRestartFilter, '_id _taskId');

        if (_.isArray(taskOutcomesToRestartQuery) && taskOutcomesToRestartQuery.length > 0) {
            for (let i = 0; i < taskOutcomesToRestartQuery.length; i++) {
                const taskOutcomeToRestart = taskOutcomesToRestartQuery[i];
                try {
                    await taskOutcomeActionService.restartTaskOutcome(_teamId, taskOutcomeToRestart._id, logger, amqp);
                    tasksRestarted.push(taskOutcomeToRestart._taskId);
                } catch (e) {
                    logger.LogWarning(`Error restarting job task: ${e}`, { taskOutcomeToRestart });
                }
            }
        }

        await jobService.LaunchTasksWithNoUpstreamDependencies(_teamId, _jobId, logger, amqp);

        // let tasksToRestartFilter = {};
        // tasksToRestartFilter['_jobId'] = _jobId;
        // tasksToRestartFilter['status'] = { $in: [TaskStatus.INTERRUPTED] };
        // const tasksToRestartQuery = await taskService.findAllTasksInternal(tasksToRestartFilter, '_id');

        // if (_.isArray(tasksToRestartQuery) && tasksToRestartQuery.length > 0) {
        //     for (let i = 0; i < tasksToRestartQuery.length; i++) {
        //         const taskToRestart = tasksToRestartQuery[i];
        //         if (tasksRestarted.indexOf(taskToRestart._id) >= 0)
        //             continue;
        //         try {
        //             await taskActionService.republishTask(_teamId, taskToRestart._id);
        //         } catch (e) {
        //             logger.LogWarning(`Error canceling job task: ${e}`, { taskToRestart });
        //         }
        //     }
        // }
    }


    public async interruptJob(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger, amqp: AMQPConnector, correlationId?: string, responseFields?: string): Promise<object> {
        const filter = { _id: _jobId, _teamId, status: JobStatus.RUNNING };
        let updatedJob: JobSchema = await JobModel.findOneAndUpdate(filter, { status: JobStatus.INTERRUPTING }, { new: true }).select('_id status');

        if (updatedJob)
            await rabbitMQPublisher.publish(_teamId, "Job", correlationId, PayloadOperation.UPDATE, convertData(JobSchema, updatedJob));

        let jobInterrupted = true;
        if (!updatedJob) {
            jobInterrupted = false;
            const jobQuery = await JobModel.findById(_jobId).find({ _teamId }).select('status');
            if (!jobQuery || (_.isArray(jobQuery) && jobQuery.length < 1))
                throw new ValidationError(`Job ${_jobId} not found`);
            updatedJob = jobQuery[0];
            throw new ValidationError(`Job ${_jobId} cannot be interrupted - current status should be "RUNNING" but is "${JobStatus[jobQuery[0].status]}"`);
        }

        if (jobInterrupted)
            await this.interruptJobTasks(_teamId, _jobId, logger);

        updatedJob = await jobService.UpdateJobStatus(_teamId, _jobId, logger, amqp, updatedJob, correlationId);

        if (responseFields) {
            return jobService.findJob(_teamId, _jobId, responseFields);
        }
        else {
            return updatedJob; // fully populated model
        }
    }


    public async restartJob(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger, amqp: AMQPConnector, correlationId?: string, responseFields?: string): Promise<JobSchema> {
        const filter = { _id: _jobId, _teamId, status: { $in: [JobStatus.INTERRUPTED, JobStatus.FAILED] } };
        let updatedJob: JobSchema = await JobModel.findOneAndUpdate(filter, { status: JobStatus.RUNNING }, { new: true }).select('_id status');

        if (updatedJob)
            await rabbitMQPublisher.publish(_teamId, "Job", correlationId, PayloadOperation.UPDATE, convertData(JobSchema, updatedJob));

        let jobRestarted = true;
        if (!updatedJob) {
            jobRestarted = false;
            const jobQuery = await JobModel.findById(_jobId).find({ _teamId }).select('status');
            if (!jobQuery || (_.isArray(jobQuery) && jobQuery.length === 0))
                throw new ValidationError(`Job ${_jobId} not found`);
            updatedJob = jobQuery[0];
            throw new ValidationError(`Job ${_jobId} cannot be restarted since current status is "${JobStatus[jobQuery[0].status]}"`);
        }

        if (jobRestarted)
            await this.restartJobTasks(_teamId, _jobId, logger, amqp);

        updatedJob = await jobService.UpdateJobStatus(_teamId, _jobId, logger, amqp, updatedJob, correlationId);

        if (responseFields) {
            return jobService.findJob(_teamId, _jobId, responseFields);
        }
        else {
            return updatedJob; // fully populated model
        }
    }


    public async cancelJob(_teamId: mongodb.ObjectId, _jobId: mongodb.ObjectId, logger: BaseLogger, amqp: AMQPConnector, correlationId?: string, responseFields?: string): Promise<JobSchema> {
        const filter = { _id: _jobId, _teamId, $or: [{ status: { $lt: JobStatus.CANCELING } }, { status: JobStatus.FAILED }] };
        let updatedJob: JobSchema = await JobModel.findOneAndUpdate(filter, { status: JobStatus.CANCELING }, { new: true }).select('_id status');

        if (updatedJob)
            await rabbitMQPublisher.publish(_teamId, "Job", correlationId, PayloadOperation.UPDATE, convertData(JobSchema, updatedJob));

        let jobCanceled = true;
        if (!updatedJob) {
            jobCanceled = false;
            const jobQuery = await JobModel.findById(_jobId).find({ _teamId }).select('status');
            if (!jobQuery || (_.isArray(jobQuery) && jobQuery.length === 0))
                throw new ValidationError(`Job ${_jobId} not found`);
            updatedJob = jobQuery[0];
            throw new ValidationError(`Job ${_jobId} cannot be canceled since current status is "${JobStatus[jobQuery[0].status]}"`);
        }

        if (jobCanceled)
            await this.cancelJobTasks(_teamId, _jobId, logger);

        updatedJob = await jobService.UpdateJobStatus(_teamId, _jobId, logger, amqp, updatedJob, correlationId);

        if (responseFields) {
            return jobService.findJob(_teamId, _jobId, responseFields);
        }
        else {
            return updatedJob; // fully populated model
        }
    }
}

export const jobActionService = new JobActionService();