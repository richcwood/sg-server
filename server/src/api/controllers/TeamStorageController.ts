import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { TeamStorageSchema, TeamStorageModel } from '../domain/TeamStorage';
import { defaultBulkGet } from '../utils/BulkGet';
import { teamStorageService } from '../services/TeamStorageService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class TeamStorageController {

    public async getManyTeamStorages(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, TeamStorageSchema, TeamStorageModel, teamStorageService);
    }


    public async getTeamStorage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const teamStorage = await teamStorageService.findTeamStorage(_teamId, new mongodb.ObjectId(req.params.teamStorageId), (<string>req.query.responseFields));

            if (_.isArray(teamStorage) && teamStorage.length === 0) {
                next(new MissingObjectError(`TeamStorage ${req.params.teamStorageId} not found.`));
            }
            else {
                response.data = convertResponseData(TeamStorageSchema, teamStorage[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.teamStorageId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                next(new MissingObjectError(`TeamStorage ${req.params.teamStorageId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createTeamStorage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newTeamStorage = await teamStorageService.createTeamStorage(_teamId, convertRequestData(TeamStorageSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
            response.data = convertResponseData(TeamStorageSchema, newTeamStorage);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updateTeamStorage(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedTeamStorage: any = await teamStorageService.updateTeamStorage(_teamId, new mongodb.ObjectId(req.params.teamStorageId), convertRequestData(TeamStorageSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));

            if (_.isArray(updatedTeamStorage) && updatedTeamStorage.length === 0) {
                next(new MissingObjectError(`TeamStorage ${req.params.teamStorageId} not found.`));
            }
            else {
                response.data = convertResponseData(TeamStorageSchema, updatedTeamStorage);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }
}

export const teamStorageController = new TeamStorageController();