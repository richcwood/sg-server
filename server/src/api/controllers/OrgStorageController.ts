import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { OrgStorageSchema, OrgStorageModel } from '../domain/OrgStorage';
import { defaultBulkGet } from '../utils/BulkGet';
import { orgStorageService } from '../services/OrgStorageService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class OrgStorageController {

    public async getManyOrgStorages(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        defaultBulkGet({ _orgId }, req, resp, next, OrgStorageSchema, OrgStorageModel, orgStorageService);
    }


    public async getOrgStorage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = (resp as any).body;
            const orgStorage = await orgStorageService.findOrgStorage(_orgId, new mongodb.ObjectId(req.params.orgStorageId), req.query.responseFields);

            if (_.isArray(orgStorage) && orgStorage.length === 0) {
                next(new MissingObjectError(`OrgStorage ${req.params.orgStorageId} not found.`));
            }
            else {
                response.data = convertResponseData(OrgStorageSchema, orgStorage[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.orgStorageId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`OrgStorage ${req.params.orgStorageId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createOrgStorage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newOrgStorage = await orgStorageService.createOrgStorage(_orgId, convertRequestData(OrgStorageSchema, req.body), req.header('correlationId'), req.query.responseFields);
            response.data = convertResponseData(OrgStorageSchema, newOrgStorage);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateOrgStorage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedOrgStorage: any = await orgStorageService.updateOrgStorage(_orgId, new mongodb.ObjectId(req.params.orgStorageId), convertRequestData(OrgStorageSchema, req.body), req.header('correlationId'), req.query.responseFields);

            if (_.isArray(updatedOrgStorage) && updatedOrgStorage.length === 0) {
                next(new MissingObjectError(`OrgStorage ${req.params.orgStorageId} not found.`));
            }
            else {
                response.data = convertResponseData(OrgStorageSchema, updatedOrgStorage);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }
}

export const orgStorageController = new OrgStorageController();