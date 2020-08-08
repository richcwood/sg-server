import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { JobDefSchema, JobDefModel } from '../domain/JobDef';
import { defaultBulkGet } from '../utils/BulkGet';
import { jobDefService } from '../services/JobDefService';
import { taskDefService } from '../services/TaskDefService';
import { StepDefSchema } from '../domain/StepDef';
import { stepDefService } from '../services/StepDefService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class JobDefController {


  public async getManyJobDefs(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    defaultBulkGet({ _orgId }, req, resp, next, JobDefSchema, JobDefModel, jobDefService);
  }


  public async getJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
      const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobDefId);
      const response: ResponseWrapper = (resp as any).body;
      const jobDef = await jobDefService.findJobDef(_orgId, _jobDefId, req.query.responseFields);

      if (_.isArray(jobDef) && jobDef.length === 0) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        response.data = convertResponseData(JobDefSchema, jobDef[0]);
        next();
      }
    }
    catch (err) {
      // If req.params.jobDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }


  public async createJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDef(_orgId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), req.query.responseFields);
      response.data = convertResponseData(JobDefSchema, newJobDef[0]);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async createJobDefFromJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDefFromJobDef(_orgId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), req.query.responseFields);
      response.data = convertResponseData(JobDefSchema, newJobDef[0]);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async createJobDefFromScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDefFromScript(_orgId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), req.query.responseFields);
      response.data = convertResponseData(JobDefSchema, newJobDef[0]);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async createJobDefFromCron(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newJobDef = await jobDefService.createJobDefFromCron(_orgId, convertRequestData(JobDefSchema, req.body), req.header('correlationId'), req.query.responseFields);
      response.data = convertResponseData(JobDefSchema, newJobDef[0]);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async updateJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const _jobDefId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.params.jobDefId);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedJobDef: any = await jobDefService.updateJobDef(_orgId, _jobDefId, convertRequestData(JobDefSchema, req.body), null, req.get('correlationId'), <null | string>req.headers['email'], req.query.responseFields);

      if (_.isArray(updatedJobDef) && updatedJobDef.length === 0) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        response.data = convertResponseData(JobDefSchema, updatedJobDef[0]);
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }


  public async deleteJobDef(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const jobDefs = await jobDefService.findJobDef(_orgId, new mongodb.ObjectId(req.params.jobDefId), req.query.responseFields);

      if (_.isArray(jobDefs) && jobDefs.length === 0) {
        return next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        const jobDef = jobDefs[0];
        // First delete all of the task defs associated with the job
        const taskDefIds = await taskDefService.findJobDefTaskDefs(_orgId, new mongodb.ObjectId(jobDef._id), '_id');

        for (const { _id } of taskDefIds) {
          /// Delete step defs for this task
          let stepDefsSourceQuery: StepDefSchema[] = await stepDefService.findTaskDefStepDefs(_orgId, _id);
          for (let i = 0; i < stepDefsSourceQuery.length; i++) {
            let stepDefSource: StepDefSchema = stepDefsSourceQuery[i];
            await stepDefService.deleteStepDef(_orgId, stepDefSource._id, req.get('correlationId'));
          }

          await taskDefService.deleteTaskDef(_orgId, new mongodb.ObjectId(_id), req.get('correlationId'));
        }

        // now delete the actual job
        response.data = jobDefService.deleteJobDef(_orgId, new mongodb.ObjectId(jobDef._id), req.get('correlationId'));
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      // If req.params.jobDefId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`JobDef ${req.params.jobDefId} not found.`));
      }
      else {
        next(err);
      }
    }
  }
}

export const jobDefController = new JobDefController();