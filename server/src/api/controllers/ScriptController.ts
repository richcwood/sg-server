import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { ScriptSchema, ScriptModel } from '../domain/Script';
import { UserSchema } from '../domain/User';
import { defaultBulkGet } from '../utils/BulkGet';
import { scriptService } from '../services/ScriptService';
import { userService } from '../services/UserService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class ScriptController {
    public async getManyScripts(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, ScriptSchema, ScriptModel, scriptService);

        // const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        // const _jobId = <string>req.params.jobId;
        // const response: ResponseWrapper = (resp as any).body;

        // const scripts = await scriptService.findAllScripts(_teamId, _jobId, (<string>req.query.responseFields));

        // response.data = scripts;

        // return next();
        // defaultBulkGet(_teamId, req, resp, next, ScriptSchema, ScriptModel, scriptService);
    }

    public async getScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const script: ScriptSchema = await scriptService.findScript(
                _teamId,
                new mongodb.ObjectId(req.params.scriptId),
                <string>req.query.responseFields
            );

            if (!script) {
                return next(new MissingObjectError(`Script ${req.params.scriptId} not found.`));
            } else {
                response.data = convertResponseData(ScriptSchema, script);
                return next();
            }
        } catch (err) {
            // If req.params.scriptId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Script ${req.params.scriptId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newScript = await scriptService.createScript(
                _teamId,
                convertRequestData(ScriptSchema, req.body),
                new mongodb.ObjectId(<string>req.headers.userid),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(ScriptSchema, newScript);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedScript: any = await scriptService.updateScript(
                _teamId,
                new mongodb.ObjectId(req.params.scriptId),
                convertRequestData(ScriptSchema, req.body),
                new mongodb.ObjectId(<string>req.headers.userid),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedScript) && updatedScript.length === 0) {
                return next(new MissingObjectError(`Script ${req.params.scriptId} not found.`));
            } else {
                response.data = convertResponseData(ScriptSchema, updatedScript);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteScript(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await scriptService.deleteScript(
                _teamId,
                new mongodb.ObjectId(req.params.scriptId),
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const scriptController = new ScriptController();
