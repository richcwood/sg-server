import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { TeamVariableSchema, TeamVariableModel } from '../domain/TeamVariable';
import { defaultBulkGet } from '../utils/BulkGet';
import { teamVariableService } from '../services/TeamVariableService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class TeamVariableController {
    public async getManyTeamVariables(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, TeamVariableSchema, TeamVariableModel, teamVariableService);
    }

    public async getTeamVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const teamVariable = await teamVariableService.findTeamVariable(
                _teamId,
                new mongodb.ObjectId(req.params.teamVariableId),
                <string>req.query.responseFields
            );

            if (_.isArray(teamVariable) && teamVariable.length === 0) {
                return next(new MissingObjectError(`TeamVariable ${req.params.teamVariableId} not found.`));
            } else {
                response.data = convertResponseData(TeamVariableSchema, teamVariable[0]);
                return next();
            }
        } catch (err) {
            // If req.params.teamVariableId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`TeamVariable ${req.params.teamVariableId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createTeamVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newTeamVariable = await teamVariableService.createTeamVariable(
                _teamId,
                convertRequestData(TeamVariableSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(TeamVariableSchema, newTeamVariable);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateTeamVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedTeamVariable: any = await teamVariableService.updateTeamVariable(
                _teamId,
                new mongodb.ObjectId(req.params.teamVariableId),
                convertRequestData(TeamVariableSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedTeamVariable) && updatedTeamVariable.length === 0) {
                return next(new MissingObjectError(`TeamVariable ${req.params.teamVariableId} not found.`));
            } else {
                response.data = convertResponseData(TeamVariableSchema, updatedTeamVariable);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteTeamVariable(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await teamVariableService.deleteTeamVariable(
                _teamId,
                new mongodb.ObjectId(req.params.teamVariableId),
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const teamVariableController = new TeamVariableController();
