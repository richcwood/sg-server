import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { SaascipeSchema, SaascipeModel } from '../domain/Saascipe';
import { defaultBulkGet } from '../utils/BulkGet';
import { saascipeService } from '../services/SaascipeService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class SaascipeController {
    public async getManySaascipes(req: Request, resp: Response, next: NextFunction): Promise<void> {
        defaultBulkGet({}, req, resp, next, SaascipeSchema, SaascipeModel, saascipeService);
    }

    public async getSaascipe(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const response: ResponseWrapper = (resp as any).body;
            const saascipe = await saascipeService.findSaascipe(new mongodb.ObjectId(req.params.saascipeId));

            if (!saascipe) {
                return next(new MissingObjectError(`Saascipe ${req.params.saascipeId} not found.`));
            } else {
                response.data = convertResponseData(SaascipeSchema, saascipe);
                return next();
            }
        } catch (err) {
            // If req.params.saascipeId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Saascipe ${req.params.saascipeId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createSaascipe(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        req.body._publisherUserId = new mongodb.ObjectId(<string>req.headers.userid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newSaascipe = await saascipeService.createSaascipe(
                _teamId,
                convertRequestData(SaascipeSchema, req.body),
                req.header('correlationId')
            );
            response.data = convertResponseData(SaascipeSchema, newSaascipe);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateSaascipe(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedSaascipe: any = await saascipeService.updateSaascipe(
                _teamId,
                new mongodb.ObjectId(req.params.saascipeId),
                convertRequestData(SaascipeSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedSaascipe) && updatedSaascipe.length === 0) {
                return next(new MissingObjectError(`Saascipe ${req.params.saascipeId} not found.`));
            } else {
                response.data = convertResponseData(SaascipeSchema, updatedSaascipe);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteSaascipe(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await saascipeService.deleteSaascipe(
                _teamId,
                new mongodb.ObjectId(req.params.saascipeId),
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const saascipeController = new SaascipeController();
