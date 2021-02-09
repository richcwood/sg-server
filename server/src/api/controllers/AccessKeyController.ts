import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { AccessKeySchema, AccessKeyModel } from '../domain/AccessKey';
import { defaultBulkGet } from '../utils/BulkGet';
import { accessKeyService } from '../services/AccessKeyService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { BaseLogger } from '../../shared/SGLogger';


export class AccessKeyController {

    public async getManyAccessKeys(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, AccessKeySchema, AccessKeyModel, accessKeyService);
    }


    public async getAccessKey(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const accessKey = await accessKeyService.findAccessKey(_teamId, new mongodb.ObjectId(req.params.accessKeyId), (<string>req.query.responseFields));

            if (_.isArray(accessKey) && accessKey.length === 0) {
                next(new MissingObjectError(`AccessKey ${req.params.accessKeyId} not found.`));
            }
            else {
                response.data = convertResponseData(AccessKeySchema, accessKey[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.accessKeyId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`AccessKey ${req.params.accessKeyId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createAccessKey(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            let responseFields: string = (<string>req.query.responseFields);
            if (!responseFields)
                responseFields = '';
            else
                responseFields = responseFields.trim();
            if (responseFields != '' && responseFields.indexOf('accessKeySecret') < 0)
                responseFields += ' accessKeySecret';

            req.body.createdBy = new mongodb.ObjectId(<string>req.headers.userid);
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const teamAccessRightIds: string[] = <string[]>req.headers.teamAccessRightIds;
            const newAccessKey: AccessKeySchema = <AccessKeySchema>await accessKeyService.createAccessKey(_teamId, teamAccessRightIds, convertRequestData(AccessKeySchema, req.body), req.header('correlationId'), responseFields);
            response.data = convertResponseData(AccessKeySchema, newAccessKey);
            if (_.isArray(newAccessKey)) {
                for (let i = 0; i < response.data.length; i++)
                    response.data[i].accessKeySecret = newAccessKey[i].accessKeySecret;
            } else {
                response.data.accessKeySecret = newAccessKey.accessKeySecret;
            }

            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateAccessKey(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const updatedAccessKey: any = await accessKeyService.updateAccessKey(_teamId, new mongodb.ObjectId(req.params.accessKeyId), convertRequestData(AccessKeySchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));

            if (_.isArray(updatedAccessKey) && updatedAccessKey.length === 0) {
                next(new MissingObjectError(`AccessKey ${req.params.accessKeyId} not found.`));
            }
            else {
                response.data = convertResponseData(AccessKeySchema, updatedAccessKey);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async deleteAccessKey(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            response.data = await accessKeyService.deleteAccessKey(_teamId, new mongodb.ObjectId(req.params.accessKeyId), req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const accessKeyController = new AccessKeyController();