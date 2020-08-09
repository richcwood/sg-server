import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { JobSchema, JobModel } from '../domain/Job';
import { defaultBulkGet } from '../utils/BulkGet';
import { jobService } from '../services/JobService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { BaseLogger } from '../../shared/SGLogger';
import { TaskSource } from '../../shared/Enums';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class JobController {

    public async getManyJobs(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        defaultBulkGet({ _orgId }, req, resp, next, JobSchema, JobModel, jobService);
    }


    public async getJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = (resp as any).body;
            const job = await jobService.findJob(_orgId, new mongodb.ObjectId(req.params.jobId), req.query.responseFields);
            console.log('JobController -> getJob -> job -> ', JSON.stringify(job, null, 4));

            if (_.isArray(job) && job.length === 0) {
                next(new MissingObjectError(`Job ${req.params.jobId} not found.`));
            }
            else {
                response.data = convertResponseData(JobSchema, job[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.jobId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Job ${req.params.jobId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createInteractiveConsoleJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            // logger.LogDebug('JobRouter -> POST ->', {
            //     'Headers': JSON.stringify(req.headers, null, 4),
            //     'Params': JSON.stringify(req.params, null, 4)
            // });

            let newJob = await jobService.createJob(_orgId, req.body, createdBy, TaskSource.CONSOLE, logger, req.header('correlationId'), req.query.responseFields);
            response.data = convertResponseData(JobSchema, newJob);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async createJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            // logger.LogDebug('JobRouter -> POST ->', {
            //     'Headers': JSON.stringify(req.headers, null, 4),
            //     'Params': JSON.stringify(req.params, null, 4)
            // });

            if (Object.keys(req.headers).indexOf('_jobdefid') >= 0) {
                const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._jobdefid);
                let newJob = await jobService.createJobFromJobDef(_orgId, _jobDefId, req.body, req.header('correlationId'), req.query.responseFields);
                response.data = convertResponseData(JobSchema, newJob);
                response.statusCode = ResponseCode.CREATED;
            } else {
                let newJob = await jobService.createJob(_orgId, req.body, createdBy, TaskSource.JOB, logger, req.header('correlationId'), req.query.responseFields);
                response.data = convertResponseData(JobSchema, newJob);
                response.statusCode = ResponseCode.CREATED;
            }
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            let updatedJob: any = await jobService.updateJob(_orgId, new mongodb.ObjectId(req.params.jobId), convertRequestData(JobSchema, req.body), req.header('correlationId'), req.query.responseFields);

            if (_.isArray(updatedJob) && updatedJob.length === 0) {
                next(new MissingObjectError(`Job ${req.params.jobId} not found.`));
            }
            else {
                response.data = convertResponseData(JobSchema, updatedJob);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }
}

export const jobController = new JobController();