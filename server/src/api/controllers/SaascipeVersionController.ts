import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { SaascipeVersionSchema, SaascipeVersionModel } from '../domain/SaascipeVersion';
import { defaultBulkGet } from '../utils/BulkGet';
import { saascipeVersionService } from '../services/SaascipeVersionService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class SaascipeVersionController {
    public async getManySaascipeVersions(req: Request, resp: Response, next: NextFunction): Promise<void> {
        defaultBulkGet({}, req, resp, next, SaascipeVersionSchema, SaascipeVersionModel, saascipeVersionService);
    }

    public async getSaascipeVersion(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const response: ResponseWrapper = (resp as any).body;
            const saascipeVersion = await saascipeVersionService.findSaascipeVersion(
                new mongodb.ObjectId(req.params.saascipeVersionId)
            );

            if (!saascipeVersion) {
                return next(new MissingObjectError(`SaascipeVersion ${req.params.saascipeVersionId} not found.`));
            } else {
                response.data = convertResponseData(SaascipeVersionSchema, saascipeVersion);
                return next();
            }
        } catch (err) {
            // If req.params.saascipeVersionId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`SaascipeVersion ${req.params.saascipeVersionId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createSaascipeVersion(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body._publisherUserId = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newSaascipeVersion = await saascipeVersionService.createSaascipeVersion(
                _teamId,
                convertRequestData(SaascipeVersionSchema, req.body),
                req.header('correlationId')
            );
            response.data = convertResponseData(SaascipeVersionSchema, newSaascipeVersion);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateSaascipeVersion(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedSaascipeVersion: any = await saascipeVersionService.updateSaascipeVersion(
                _teamId,
                new mongodb.ObjectId(req.params.saascipeVersionId),
                convertRequestData(SaascipeVersionSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedSaascipeVersion) && updatedSaascipeVersion.length === 0) {
                return next(new MissingObjectError(`SaascipeVersion ${req.params.saascipeVersionId} not found.`));
            } else {
                response.data = convertResponseData(SaascipeVersionSchema, updatedSaascipeVersion);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteSaascipeVersion(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await saascipeVersionService.deleteSaascipeVersion(
                _teamId,
                new mongodb.ObjectId(req.params.saascipeVersionId),
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const saascipeVersionController = new SaascipeVersionController();
