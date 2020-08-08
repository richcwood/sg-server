import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { OrgVariableSchema, OrgVariableModel } from '../domain/OrgVariable';
import { defaultBulkGet } from '../utils/BulkGet';
import { orgVariableService } from '../services/OrgVariableService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class OrgVariableController {

    public async getManyOrgVariables(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        defaultBulkGet({ _orgId }, req, resp, next, OrgVariableSchema, OrgVariableModel, orgVariableService);
    }


    public async getOrgVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = (resp as any).body;
            const orgVariable = await orgVariableService.findOrgVariable(_orgId, new mongodb.ObjectId(req.params.orgVariableId), req.query.responseFields);

            if (_.isArray(orgVariable) && orgVariable.length === 0) {
                next(new MissingObjectError(`OrgVariable ${req.params.orgVariableId} not found.`));
            }
            else {
                response.data = convertResponseData(OrgVariableSchema, orgVariable[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.orgVariableId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`OrgVariable ${req.params.orgVariableId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createOrgVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newOrgVariable = await orgVariableService.createOrgVariable(_orgId, convertRequestData(OrgVariableSchema, req.body), req.header('correlationId'), req.query.responseFields);
            response.data = convertResponseData(OrgVariableSchema, newOrgVariable);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateOrgVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedOrgVariable: any = await orgVariableService.updateOrgVariable(_orgId, new mongodb.ObjectId(req.params.orgVariableId), convertRequestData(OrgVariableSchema, req.body), req.header('correlationId'), req.query.responseFields);

            if (_.isArray(updatedOrgVariable) && updatedOrgVariable.length === 0) {
                next(new MissingObjectError(`OrgVariable ${req.params.orgVariableId} not found.`));
            }
            else {
                response.data = convertResponseData(OrgVariableSchema, updatedOrgVariable);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async deleteOrgVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await orgVariableService.deleteOrgVariable(_orgId, new mongodb.ObjectId(req.params.orgVariableId), req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const orgVariableController = new OrgVariableController();