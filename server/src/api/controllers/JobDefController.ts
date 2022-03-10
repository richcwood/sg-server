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
      const jobDef = await jobDefService.findJobDef(_teamId, _jobDefId, (<string>req.query.responseFields));

      if (!jobDef) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        response.data = convertResponseData(JobDefSchema, jobDef);
        next();
      }
    }
    catch (err) {
      // If req.params.jobDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }


  public async createJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDef(_teamId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
      response.data = convertResponseData(JobDefSchema, newJobDef);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async createJobDefFromJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDefFromJobDef(_teamId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
      response.data = convertResponseData(JobDefSchema, newJobDef[0]);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async createJobDefFromScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDefFromScript(_teamId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
      response.data = convertResponseData(JobDefSchema, newJobDef[0]);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async createJobDefFromCron(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDefFromCron(_teamId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
      response.data = convertResponseData(JobDefSchema, newJobDef[0]);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async updateJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const logger: BaseLogger = (<any>req).logger;
    const amqp: AMQPConnector = (<any>req).amqp;
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobDefId);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedJobDef: any = await jobDefService.updateJobDef(_teamId, _jobDefId, convertRequestData(JobDefSchema, req.body), logger, amqp, null, req.get('correlationId'), <null | string>req.headers['email'], (<string>req.query.responseFields));

      if (!updatedJobDef) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        response.data = convertResponseData(JobDefSchema, updatedJobDef);
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }


  public async deleteJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp['body'];
    try {
      const jobDef = await jobDefService.findJobDef(_teamId, new mongodb.ObjectId(req.params.jobDefId), (<string>req.query.responseFields));

      if (!jobDef) {
        return next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        // First delete all of the task defs associated with the job
        const taskDefIds = await taskDefService.findJobDefTaskDefs(_teamId, new mongodb.ObjectId(jobDef._id), '_id');

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
        response.data = jobDefService.deleteJobDef(_teamId, new mongodb.ObjectId(jobDef._id), req.get('correlationId'));
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      // If req.params.jobDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }

  public async getJobDefsExport(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const query = createQuery(JobDefSchema, JobDefModel, req.query).find({_teamId});
      const jobDefs = await query.exec();

      const exportedJobs = await jobDefService.serializeExportedJobDefs(_teamId, jobDefs);

      // For debugging, how to stream the file normally / not as a download
      // const response: ResponseWrapper = resp['body'];
      // response.data = exportedJobs;
      // next();

      // How to save file as a download
      const jobBuffer = Buffer.from(JSON.stringify(exportedJobs));
      const readStream = new Stream.PassThrough();
      readStream.end(jobBuffer);

      resp.set('Content-disposition', 'attachment; filename=exportedJobs.sgj');
      resp.set('Content-Type', 'text/plain');
      readStream.pipe(resp);
    }
    catch (err) {
      // If req.params.jobDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }

  public async importJobDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const userId = new mongodb.ObjectId(<string>req.headers.userid);

    const response: ResponseWrapper = resp['body'];
    try {
      const inputFile = (<any>req).file;
      if(!inputFile){
        throw 'Input file was not found.';
      }

      const dataJSON = JSON.parse(readFileSync(inputFile.path, 'utf8'));

      const importReport = await jobDefService.importJobDefs(_teamId, userId, req.header('correlationId'), dataJSON);
      response.statusCode = ResponseCode.CREATED;
      response.data = importReport;
      next();
    }
    catch (err) {
      console.log('\nOoooh crap', err);
      next(err);
    }
  }
}

export const jobDefController = new JobDefController();