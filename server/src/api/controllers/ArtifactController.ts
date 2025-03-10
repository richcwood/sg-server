import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { ArtifactSchema, ArtifactModel } from '../domain/Artifact';
import { defaultBulkGet } from '../utils/BulkGet';
import { artifactService } from '../services/ArtifactService';
import { MissingObjectError, FreeTierLimitExceededError } from '../utils/Errors';
import { FreeTierChecks } from '../../shared/FreeTierChecks';
import { BaseLogger } from '../../shared/SGLogger';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as config from 'config';

export class ArtifactController {
    public async getManyArtifacts(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, ArtifactSchema, ArtifactModel, artifactService);
    }

    public async getArtifact(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        try {
            let _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            if (
                _teamId.toHexString() == process.env.sgAdminTeam &&
                req.body._teamId &&
                req.body._teamId != _teamId.toHexString()
            )
                _teamId = new mongodb.ObjectId(req.body._teamId);
            const response: ResponseWrapper = (resp as any).body;
            const artifact = await artifactService.findArtifact(
                _teamId,
                new mongodb.ObjectId(req.params.artifactId),
                logger
            );

            if (!artifact) {
                return next(new MissingObjectError(`Artifact ${req.params.artifactId} not found.`));
            } else {
                response.data = convertResponseData(ArtifactSchema, artifact);
                return next();
            }
        } catch (err) {
            // If req.params.artifactId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Artifact ${req.params.artifactId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createArtifact(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            if (await FreeTierChecks.IsTeamOnFreeTier(_teamId))
                throw new FreeTierLimitExceededError('Upgrade to upload artifacts');

            const newArtifact = await artifactService.createArtifact(
                _teamId,
                convertRequestData(ArtifactSchema, req.body),
                logger,
                req.header('correlationId')
            );
            response.data = convertResponseData(ArtifactSchema, newArtifact);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateArtifact(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            const updatedArtifact: any = await artifactService.updateArtifact(
                _teamId,
                new mongodb.ObjectId(req.params.artifactId),
                convertRequestData(ArtifactSchema, req.body),
                logger,
                req.header('correlationId')
            );

            if (_.isArray(updatedArtifact) && updatedArtifact.length === 0) {
                return next(new MissingObjectError(`Artifact ${req.params.artifactId} not found.`));
            } else {
                response.data = convertResponseData(ArtifactSchema, updatedArtifact);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteArtifact(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            response.data = await artifactService.deleteArtifact(
                _teamId,
                new mongodb.ObjectId(req.params.artifactId),
                logger,
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const artifactController = new ArtifactController();
