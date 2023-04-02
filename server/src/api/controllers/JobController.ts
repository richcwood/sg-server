import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { JobSchema, JobModel } from '../domain/Job';
import { defaultBulkGet } from '../utils/BulkGet';
import { jobService } from '../services/JobService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { BaseLogger } from '../../shared/SGLogger';
import { TaskSource } from '../../shared/Enums';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { FreeTierChecks } from '../../shared/FreeTierChecks';
import { AMQPConnector } from '../../shared/AMQPLib';

export class JobController {
    public async getManyJobs(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, JobSchema, JobModel, jobService);
    }

    public async getJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const job = await jobService.findJob(
                _teamId,
                new mongodb.ObjectId(req.params.jobId),
                <string>req.query.responseFields
            );
            // console.log('JobController -> getJob -> job -> ', JSON.stringify(job, null, 4));

            if (!job) {
                return next(new MissingObjectError(`Job ${req.params.jobId} not found.`));
            } else {
                response.data = convertResponseData(JobSchema, job);
                return next();
            }
        } catch (err) {
            // If req.params.jobId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Job ${req.params.jobId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createInteractiveConsoleJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            // logger.LogDebug('JobRouter -> POST ->', {
            //     'Headers': JSON.stringify(req.headers, null, 4),
            //     'Params': JSON.stringify(req.params, null, 4)
            // });
            await FreeTierChecks.MaxScriptsCheck(_teamId);

            let newJob = await jobService.createJob(
                _teamId,
                req.body,
                createdBy,
                TaskSource.CONSOLE,
                logger,
                amqp,
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(JobSchema, newJob);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async deleteJobs(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            let filter: any = { _teamId };
            if (Object.keys(req.headers).indexOf('_jobdefid') >= 0)
                filter._jobDefId = new mongodb.ObjectId(<string>req.headers._jobdefid);
            if (Object.keys(req.headers).indexOf('name') >= 0) filter.name = { $regex: <string>req.headers.name };
            if (Object.keys(req.headers).indexOf('status') >= 0) filter.status = req.headers.status;
            let res = await jobService.deleteJobs(_teamId, filter, logger, req.header('correlationId'));
            response.data = res;
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async deleteJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            let filter: any = { _id: new mongodb.ObjectId(req.params.jobId), _teamId };
            response.data = await jobService.deleteJobs(_teamId, filter, logger, req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async createJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const createdBy: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers.userid);
        // let createdBy: string = '';
        // if (req.headers.userid)
        //     createdBy = <string>req.headers.userid;
        // else if (req.body.job && req.body.job.createdBy)
        //     createdBy = req.body.job.createdBy;
        // else if (req.headers.email)
        //     createdBy = <string>req.headers.email;
        const response: ResponseWrapper = resp['body'];
        try {
            // logger.LogDebug('JobRouter -> POST ->', {
            //     'Headers': JSON.stringify(req.headers, null, 4),
            //     'Params': JSON.stringify(req.params, null, 4)
            // });

            await FreeTierChecks.MaxScriptsCheck(_teamId);
            // await FreeTierChecks.PaidTierRequired(_teamId, 'Please upgrade to the paid tier to run Jobs');

            if (Object.keys(req.headers).indexOf('_jobdefid') >= 0) {
                const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._jobdefid);
                let newJob = await jobService.createJobFromJobDefId(
                    _teamId,
                    _jobDefId,
                    req.body,
                    logger,
                    amqp,
                    req.header('correlationId'),
                    <string>req.query.responseFields
                );
                response.data = convertResponseData(JobSchema, newJob);
                response.statusCode = ResponseCode.CREATED;
            } else if (Object.keys(req.headers).indexOf('jobdefname') >= 0) {
                const jobDefName: string = <string>req.headers.jobdefname;
                let newJob = await jobService.createJobFromJobDefName(
                    _teamId,
                    jobDefName,
                    req.body,
                    logger,
                    amqp,
                    req.header('correlationId'),
                    <string>req.query.responseFields
                );
                response.data = convertResponseData(JobSchema, newJob);
                response.statusCode = ResponseCode.CREATED;
            } else {
                let newJob = await jobService.createJob(
                    _teamId,
                    req.body,
                    createdBy,
                    TaskSource.JOB,
                    logger,
                    amqp,
                    req.header('correlationId'),
                    <string>req.query.responseFields
                );
                response.data = convertResponseData(JobSchema, newJob);
                response.statusCode = ResponseCode.CREATED;
            }
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            let updatedJob: any = await jobService.updateJob(
                _teamId,
                new mongodb.ObjectId(req.params.jobId),
                convertRequestData(JobSchema, req.body),
                logger,
                amqp,
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedJob) && updatedJob.length === 0) {
                return next(new MissingObjectError(`Job ${req.params.jobId} not found.`));
            } else {
                response.data = convertResponseData(JobSchema, updatedJob);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
}

export const jobController = new JobController();
