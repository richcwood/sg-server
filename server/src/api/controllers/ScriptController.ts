import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { ScriptSchema, ScriptModel } from '../domain/Script';
import { UserSchema } from '../domain/User';
import { defaultBulkGet } from '../utils/BulkGet';
import { scriptService } from '../services/ScriptService';
import { userService } from '../services/UserService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class ScriptController {

  public async getManyScripts(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    defaultBulkGet({ _orgId }, req, resp, next, ScriptSchema, ScriptModel, scriptService);

    // const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    // const _jobId = <string>req.params.jobId;
    // const response: ResponseWrapper = (resp as any).body;

    // const scripts = await scriptService.findAllScripts(_orgId, _jobId, req.query.responseFields);

    // response.data = scripts;

    // next();
    // defaultBulkGet(_orgId, req, resp, next, ScriptSchema, ScriptModel, scriptService);
  }


  public async getScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
      const response: ResponseWrapper = (resp as any).body;
      const script = await scriptService.findScript(_orgId, new mongodb.ObjectId(req.params.scriptId), req.query.responseFields);

      if (_.isArray(script) && script.length === 0) {
        next(new MissingObjectError(`Script ${req.params.scriptId} not found.`));
      }
      else {
        response.data = convertResponseData(ScriptSchema, script[0]);
        next();
      }
    }
    catch (err) {
      // If req.params.scriptId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof CastError) {
        next(new MissingObjectError(`Script ${req.params.scriptId} not found.`));
      }
      else {
        next(err);
      }
    }
  }


  public async createScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const newScript = await scriptService.createScript(_orgId, convertRequestData(ScriptSchema, req.body), new mongodb.ObjectId(req.headers.userid), req.header('correlationId'), req.query.responseFields);
      response.data = convertResponseData(ScriptSchema, newScript);
      response.statusCode = ResponseCode.CREATED;
      next();
    }
    catch (err) {
      next(err);
    }
  }


  public async updateScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
    const response: ResponseWrapper = resp['body'];
    try {
      const updatedScript: any = await scriptService.updateScript(_orgId, new mongodb.ObjectId(req.params.scriptId), convertRequestData(ScriptSchema, req.body), new mongodb.ObjectId(req.headers.userid), req.header('correlationId'), req.query.responseFields);

      if (_.isArray(updatedScript) && updatedScript.length === 0) {
        next(new MissingObjectError(`Script ${req.params.scriptId} not found.`));
      }
      else {
        response.data = convertResponseData(ScriptSchema, updatedScript);
        response.statusCode = ResponseCode.OK;
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }
}

export const scriptController = new ScriptController();