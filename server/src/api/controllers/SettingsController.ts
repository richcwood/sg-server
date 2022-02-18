import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { SettingsSchema, SettingsModel } from '../domain/Settings';
import { defaultBulkGet } from '../utils/BulkGet';
import { settingsService } from '../services/SettingsService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { FreeTierChecks } from '../../shared/FreeTierChecks';


export class SettingsController {

    public async getManySettings(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, SettingsSchema, SettingsModel, settingsService);
    }


    public async getSettings(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const response: ResponseWrapper = (resp as any).body;
            const settings = await settingsService.findSettings(req.params.type);

            if (_.isArray(settings) && settings.length === 0) {
                next(new MissingObjectError(`Settings ${req.params.type} not found.`));
            }
            else {
                response.data = convertResponseData(SettingsSchema, settings[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.settingsId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`Settings ${req.params.type} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createSettings(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const newSettings = await settingsService.createSettings(convertRequestData(SettingsSchema, req.body));
            response.data = convertResponseData(SettingsSchema, newSettings);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateSettings(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedSettings: any = await settingsService.updateSettings(req.params.type, convertRequestData(SettingsSchema, req.body));

            if (_.isArray(updatedSettings) && updatedSettings.length === 0) {
                next(new MissingObjectError(`Settings ${req.params.type} not found.`));
            }
            else {
                response.data = convertResponseData(SettingsSchema, updatedSettings);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async deleteSettings(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await settingsService.deleteSettings(req.params.type);
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const settingsController = new SettingsController();