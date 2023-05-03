const environment = process.env.NODE_ENV || 'development';

import { NextFunction, Request, Response, Router, response } from 'express';
const jwt = require('jsonwebtoken');

import * as config from 'config';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as util from 'util';

import { teamService } from '../services/TeamService';
import { settingsService } from '../services/SettingsService';

import { S3Access } from '../../shared/S3Access';
import { BaseLogger } from '../../shared/SGLogger';

import { verifyAccessRights } from '../utils/AccessRightsVerifier';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { agentService } from '../services/AgentService';

let appName: string = 'AgentDownloadRouter';
let agentDownloadRouterLogger: BaseLogger = new BaseLogger(appName);
agentDownloadRouterLogger.Start();

const validPlatforms: string[] = ['freebsd', 'linux', 'alpine', 'macos', 'win'];
const validArchitectures: string[] = ['x64', 'x86', 'armv6', 'armv7'];

export class AgentDownloadRouter {
    public readonly router: Router;
    private s3Access: S3Access;

    constructor() {
        this.s3Access = new S3Access(agentDownloadRouterLogger);

        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get(
            '/agent/:machineId/:platform/:arch?',
            verifyAccessRights(['AGENT_DOWNLOAD', 'GLOBAL']),
            this.downloadAgent.bind(this)
        );
        this.router.get('/agentstub/:platform/:arch?', this.downloadAgentStub.bind(this));
        this.router.get('/agentdownloadscript', this.downloadAgentDownloaderScript.bind(this));
        this.router.get('/nssm/:arch', this.downloadNSSM.bind(this));
    }

    async downloadAgentDownloaderScript(req: Request, res: Response, next: NextFunction) {
        const response: ResponseWrapper = (res as any).body;

        try {
            const agentDownloaderS3Path = 'agent-stub/download_sg_agent.py';
            const signedUrl = await this.s3Access.getSignedS3URL(
                agentDownloaderS3Path,
                config.get('S3_BUCKET_AGENT_BINARIES')
            );
            response.data = signedUrl;
            response.statusCode = ResponseCode.OK;
            next();
            return;
        } catch (e) {
            next(e);
            return;
        }
    }

    async downloadNSSM(req: Request, res: Response, next: NextFunction) {
        const response: ResponseWrapper = (res as any).body;

        try {
            let arch: string = <string>req.params.arch;
            if (arch != 'x64' && arch != 'x86') throw new Error(`Invalid arch param - must be "x64" or "x86"`);
            const nssmPath = `nssm/${arch}/nssm.zip`;
            const signedUrl = await this.s3Access.getSignedS3URL(nssmPath, config.get('S3_BUCKET_SHARED_FILES'));
            response.data = signedUrl;
            response.statusCode = ResponseCode.OK;
            next();
            return;
        } catch (e) {
            next(e);
            return;
        }
    }

    validateAgentDownloadParameters(platform, arch): { platform: string; arch: string } {
        if (validPlatforms.indexOf(platform) < 0) {
            throw new ValidationError('Missing or invalid platform param');
        }
        if (!arch) {
            arch = '';
        } else {
            if ((platform == 'macos' || platform == 'linux') && arch == 'x64') {
                arch = '';
            } else {
                if (validArchitectures.indexOf(arch) < 0) {
                    throw new ValidationError('Invalid arch param');
                }
            }
        }
        return { platform, arch };
    }

    /**
     * Gets the agent s3 path
     * @param agentVersion
     * @param agentType
     * @param platform
     * @param arch
     * @returns
     */
    async getAgentS3Path(
        agentBuildKey: string,
        platform: string,
        arch: string,
        logger: BaseLogger,
        agentVersion: string = undefined
    ): Promise<string> {
        const statusKey = `${agentBuildKey}.status`;
        const locationKey = `${agentBuildKey}.location`;
        const filter = {};
        filter[agentBuildKey] = { $exists: true };
        filter[statusKey] = { $eq: 'ready' };
        filter['Type'] = 'AgentBuild';
        let agentInstallDetails = null;
        let agentInstallDetailsLookup = await settingsService.findAllSettingsInternal(filter, `${locationKey} _id`);
        if (agentInstallDetailsLookup) agentInstallDetails = agentInstallDetailsLookup[0];
        if (!agentInstallDetails) {
            logger.LogError('Agent install details not found in db', {
                filter,
            });
            throw new ValidationError('Agent install details not found in db');
        }
        let agentS3Path;
        if (agentVersion)
            agentS3Path =
                agentInstallDetails['Values']['agent_install'][agentVersion][`${platform}${arch}`]['location'];
        else agentS3Path = agentInstallDetails['Values']['agent_stub_install'][`${platform}${arch}`]['location'];
        return agentS3Path;
    }

    async downloadAgentStub(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;
        const response: ResponseWrapper = (res as any).body;

        try {
            let { platform, arch } = this.validateAgentDownloadParameters(req.params.platform, req.params.arch || '');
            const agentBuildKey = `Values.agent_stub_install.${platform}${arch}`;
            let stubS3Path = await this.getAgentS3Path(agentBuildKey, platform, arch, logger);
            let stubInstallExists = await this.s3Access.objectExists(
                stubS3Path,
                config.get('S3_BUCKET_AGENT_BINARIES')
            );
            if (!stubInstallExists) {
                logger.LogError('Agent Launcher not found in s3', {
                    Platform: platform,
                    Arch: arch,
                    S3Path: stubS3Path,
                });
                throw new MissingObjectError('Error downloading Agent Launcher');
            } else {
                const signedUrl = await this.s3Access.getSignedS3URL(
                    stubS3Path,
                    config.get('S3_BUCKET_AGENT_BINARIES')
                );
                response.data = signedUrl;
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (e) {
            return next(e);
        }
    }

    /**
     * Gets the agent version to use for the given machineId
     * @param _teamId
     * @param machineId
     */
    async getAgentVersion(_teamId: mongodb.ObjectId, machineId: string): Promise<string> {
        const agentVersionSettings = await settingsService.findSettings('AgentVersion');
        let agentVersion = agentVersionSettings.agent;
        let agentInfo = await agentService.findAgentByMachineId(_teamId, machineId, 'targetVersion');
        if (agentInfo) {
            agentVersion = agentInfo['targetVersion'];
        }
        return agentVersion;
    }

    /**
     * Converts the normal agent version format 'vx.x.x' to the mongodb compatible format 'vx_x_x'
     * @param version
     * @returns
     */
    mongoFormattedAgentVersion(version: string): string {
        return version.split('.').join('_');
    }

    /**
     * Returns a signed url that can be used to download the agent from aws s3
     * @param req
     * @param res
     * @param next
     * @returns
     */
    async downloadAgent(req: Request, res: Response, next: NextFunction) {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const logger: BaseLogger = (<any>req).logger;
        const machineId: string = <string>req.params.machineId;
        const response: ResponseWrapper = (res as any).body;

        const existingTeam = await teamService.findTeam(_teamId, 'pricingTier');
        if (!existingTeam) {
            response.data = '';
            response.statusCode = ResponseCode.NOT_FOUND;
            return next(new ValidationError(`Invalid team`));
        }

        try {
            let { platform, arch } = this.validateAgentDownloadParameters(req.params.platform, req.params.arch || '');
            const agentVersion = await this.getAgentVersion(_teamId, machineId);
            const agentVersionMongo = this.mongoFormattedAgentVersion(agentVersion);
            const agentBuildKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}`;
            let agentS3Path = await this.getAgentS3Path(agentBuildKey, platform, arch, logger, agentVersionMongo);
            let agentInstallExists = await this.s3Access.objectExists(
                agentS3Path,
                config.get('S3_BUCKET_AGENT_BINARIES')
            );
            if (!agentInstallExists) {
                logger.LogError('Agent not found in s3', {
                    Platform: platform,
                    Arch: arch,
                    S3Path: agentS3Path,
                });
                throw new MissingObjectError('Error downloading Agent');
            } else {
                const signedUrl = await this.s3Access.getSignedS3URL(
                    agentS3Path,
                    config.get('S3_BUCKET_AGENT_BINARIES')
                );
                response.data = signedUrl;
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (e) {
            return next(e);
        }
    }
}

export const agentDownloadRouterSingleton = (): AgentDownloadRouter | any => {
    return new AgentDownloadRouter();
};
export const agentDownloadRouter = (): any => {
    return agentDownloadRouterSingleton().router;
};
