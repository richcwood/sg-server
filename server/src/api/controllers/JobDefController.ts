import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { createQuery } from '../utils/BulkGet';
import { JobDefSchema, JobDefModel } from '../domain/JobDef';
import { defaultBulkGet } from '../utils/BulkGet';
import { jobDefService } from '../services/JobDefService';
import { taskDefService } from '../services/TaskDefService';
import { StepDefSchema } from '../domain/StepDef';
import { stepDefService } from '../services/StepDefService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import { Stream } from 'stream';
import { readFileSync } from 'fs';
import { BaseLogger } from '../../shared/SGLogger';
import { AMQPConnector } from '../../shared/AMQPLib';
import { scheduleService } from '../services/ScheduleService';

let errorHandler = (err, req: Request, resp: Response, next: NextFunction) => {
    // If req.params.jobDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
    if (err instanceof Error.CastError) {
        if (req.params && req.params.jobDefId)
            return next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
        else return next(new MissingObjectError(`JobDef not found.`));
    } else {
        return next(err);
    }
};

export class JobDefController {
    public async getManyJobDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, JobDefSchema, JobDefModel, jobDefService);
    }

    public async getJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobDefId);
            const response: ResponseWrapper = (resp as any).body;
            const jobDef = await jobDefService.findJobDef(_teamId, _jobDefId, <string>req.query.responseFields);

            if (!jobDef) {
                return next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
            } else {
                response.data = convertResponseData(JobDefSchema, jobDef);
                return next();
            }
        } catch (err) {
            return errorHandler(err, req, resp, next);
        }
    }

    public async createJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newJobDef: JobDefSchema = await jobDefService.createJobDef(
                _teamId,
                convertRequestData(JobDefSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(JobDefSchema, newJobDef);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async createJobDefFromJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newJobDef: JobDefSchema = await jobDefService.createJobDefFromJobDef(
                _teamId,
                convertRequestData(JobDefSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(JobDefSchema, newJobDef);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async createJobDefFromScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newJobDef: JobDefSchema = await jobDefService.createJobDefFromScript(
                _teamId,
                convertRequestData(JobDefSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(JobDefSchema, newJobDef);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async createJobDefFromCron(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newJobDef: JobDefSchema = await jobDefService.createJobDefFromCron(
                _teamId,
                convertRequestData(JobDefSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(JobDefSchema, newJobDef);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const amqp: AMQPConnector = (<any>req).amqp;
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobDefId);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedJobDef: JobDefSchema = await jobDefService.updateJobDef(
                _teamId,
                _jobDefId,
                convertRequestData(JobDefSchema, req.body),
                logger,
                amqp,
                null,
                req.get('correlationId'),
                <null | string>req.headers['email'],
                <string>req.query.responseFields
            );

            if (!updatedJobDef) {
                return next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
            } else {
                response.data = convertResponseData(JobDefSchema, updatedJobDef);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const jobDef = await jobDefService.findJobDef(
                _teamId,
                new mongodb.ObjectId(req.params.jobDefId),
                <string>req.query.responseFields
            );

            if (!jobDef) {
                return next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
            } else {
                // Delete all of the schedules associated with the job
                const scheduleIds = await scheduleService.findAllSchedulesInternal(
                    { _teamId, _jobDefId: new mongodb.ObjectId(jobDef._id) },
                    '_id'
                );
                for (const { _id } of scheduleIds) {
                    await scheduleService.deleteSchedule(_teamId, new mongodb.ObjectId(_id), req.get('correlationId'));
                }

                // Delete all of the task defs associated with the job
                const taskDefIds = await taskDefService.findJobDefTaskDefs(
                    _teamId,
                    new mongodb.ObjectId(jobDef._id),
                    '_id'
                );

                for (const { _id } of taskDefIds) {
                    /// Delete step defs for this task
                    let stepDefsSourceQuery: StepDefSchema[] = await stepDefService.findTaskDefStepDefs(_teamId, _id);
                    for (let i = 0; i < stepDefsSourceQuery.length; i++) {
                        let stepDefSource: StepDefSchema = stepDefsSourceQuery[i];
                        await stepDefService.deleteStepDef(_teamId, stepDefSource._id, req.get('correlationId'));
                    }

                    await taskDefService.deleteTaskDef(_teamId, new mongodb.ObjectId(_id), req.get('correlationId'));
                }

                // now delete the actual job
                response.data = jobDefService.deleteJobDef(
                    _teamId,
                    new mongodb.ObjectId(jobDef._id),
                    req.get('correlationId')
                );
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return errorHandler(err, req, resp, next);
        }
    }

    public async getJobDefsExport(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const query = createQuery(JobDefSchema, JobDefModel, req.query).find({ _teamId });
            const jobDefs = await query.exec();

            const exportedJobs = await jobDefService.serializeExportedJobDefs(_teamId, jobDefs);

            // For debugging, how to stream the file normally / not as a download
            // const response: ResponseWrapper = resp['body'];
            // response.data = exportedJobs;
            // return next();

            // How to save file as a download
            const jobBuffer = Buffer.from(JSON.stringify(exportedJobs));
            const readStream = new Stream.PassThrough();
            readStream.end(jobBuffer);

            resp.set('Content-disposition', 'attachment; filename=exportedJobs.sgj');
            resp.set('Content-Type', 'text/plain');
            readStream.pipe(resp);
        } catch (err) {
            // If req.params.jobDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            return errorHandler(err, req, resp, next);
        }
    }

    public async importJobDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const userId = new mongodb.ObjectId(<string>req.headers.userid);

        const response: ResponseWrapper = resp['body'];
        try {
            const inputFile = (<any>req).file;
            if (!inputFile) {
                throw 'Input file was not found.';
            }

            const dataJSON = JSON.parse(readFileSync(inputFile.path, 'utf8'));

            const importReport = await jobDefService.importJobDefs(
                _teamId,
                userId,
                req.header('correlationId'),
                dataJSON
            );
            response.statusCode = ResponseCode.CREATED;
            response.data = importReport;
            return next();
        } catch (err) {
            console.log('\nOoooh crap', err);
            return next(err);
        }
    }
}

export const jobDefController = new JobDefController();
