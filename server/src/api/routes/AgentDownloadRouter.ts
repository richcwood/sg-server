import { NextFunction, Request, Response, Router, response } from 'express';
import { MongoRepo } from '../../shared/MongoLib';
import { S3Access } from '../../shared/S3Access';
import { SGUtils } from '../../shared/SGUtils';
import { BaseLogger } from '../../shared/SGLogger';
import { ValidationError, MissingObjectError } from '../utils/Errors';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { localRestAccess } from '../utils/LocalRestAccess';
import { TeamPricingTier } from '../../shared/Enums';
import { AgentModel } from '../domain/Agent';
import { teamService } from '../services/TeamService';
import { settingsService } from '../services/SettingsService';
import { exec } from 'pkg';
import * as config from 'config';
const jwt = require('jsonwebtoken');
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

const mongoUrl = process.env.mongoUrl;
const mongoDbName = process.env.mongoDbName;

let appName: string = 'AgentDownloadRouter';
let agentDownloadRouterLogger: BaseLogger = new BaseLogger(appName);
agentDownloadRouterLogger.Start();

const validPlatforms: string[] = ['freebsd', 'linux', 'alpine', 'macos', 'win'];
const validArchitectures: string[] = ['x64', 'x86', 'armv6', 'armv7'];

export class AgentDownloadRouter {
    public readonly router: Router;
    private s3Access: S3Access;
    private mongoRepo: MongoRepo;

    constructor() {
        this.s3Access = new S3Access(agentDownloadRouterLogger);
        this.mongoRepo = new MongoRepo(appName, mongoUrl, mongoDbName, agentDownloadRouterLogger);

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

    verifyIsAgentStub(req: Request, res: Response, next: NextFunction) {
        // todo - check JWT for if it's an agent
        next();
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

    // Returns 303 if agent stub install does not exist - otherwise returns 200 plus a signed url for direct s3 download
    async downloadAgentStub(req: Request, res: Response, next: NextFunction) {
        const _teamId: string = <string>req.headers._teamid;
        const logger: BaseLogger = (<any>req).logger;
        const response: ResponseWrapper = (res as any).body;

        const platform: string = <string>req.params.platform;
        if (validPlatforms.indexOf(platform) < 0) {
            return next(new ValidationError('Missing or invalid platform param'));
            // res.status(422).send('Missing or invalid platform param');
        }

        let arch: string = <string>req.params.arch;
        if (!arch) {
            arch = '';
        } else {
            if ((platform == 'macos' || platform == 'linux') && arch == 'x64') {
                arch = '';
            } else {
                if (validArchitectures.indexOf(arch) < 0) {
                    return next(new ValidationError('Invalid arch param'));
                    // res.status(422).send('Invalid arch param');
                }
            }
        }

        // First check if we have information in mongo for this team/platform/arch stub install
        const platformKey = `Values.agent_stub_install.${platform}${arch}`;

        let queryPlatform = {};
        queryPlatform[platformKey] = { $exists: true };

        let queryStatus = {};
        const statusKey = `Values.agent_stub_install.${platform}${arch}.status`;
        queryStatus[statusKey] = { $eq: 'ready' };

        let projectionDoc = {};
        const locationKey = `Values.agent_stub_install.${platform}${arch}.location`;
        projectionDoc[locationKey] = 1;
        projectionDoc['_id'] = 1;

        const stub_install_details = await this.mongoRepo.GetOneByQuery(
            {
                $and: [{ Type: 'AgentBuild' }, queryPlatform, queryStatus],
            },
            'settings',
            projectionDoc
        );

        // Now check if the install exists in the specified s3 path
        if (stub_install_details != null) {
            try {
                let stubS3Path = stub_install_details['Values']['agent_stub_install'][`${platform}${arch}`]['location'];
                // if (platform == 'win')
                //   stubS3Path += '.exe';
                let stubInstallExists = await this.s3Access.objectExists(
                    stubS3Path,
                    config.get('S3_BUCKET_AGENT_BINARIES')
                );
                if (!stubInstallExists) {
                    logger.LogWarning('Path to agent stub from mongo does not exist in s3', {
                        Platform: platform,
                        Arch: arch,
                        S3Path: stubS3Path,
                    });
                    let queryCreateEmpty = {};
                    queryCreateEmpty[platformKey] = {};
                    await this.mongoRepo.Update(
                        'settings',
                        { _id: stub_install_details['_id'] },
                        { $set: queryCreateEmpty }
                    );
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

        response.data = '';
        response.statusCode = ResponseCode.NOT_AVAILABLE;
        return next();
    }

    // Returns 303 if agent install does not exist - otherwise returns 200 plus a signed url for direct s3 download
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

        const platform: string = <string>req.params.platform;
        if (validPlatforms.indexOf(platform) < 0) {
            return next(new ValidationError('Missing or invalid platform param'));
        }

        let arch: string = <string>req.params.arch;
        if (!arch) {
            arch = '';
        } else {
            if ((platform == 'macos' || platform == 'linux') && arch == 'x64') {
                arch = '';
            } else {
                if (validArchitectures.indexOf(arch) < 0) {
                    return next(new ValidationError('Invalid arch param'));
                    // res.status(422).send('Invalid arch param');
                }
            }
        }

        const agentVersionSettings = await settingsService.findSettings('AgentVersion');
        let agentVersion = agentVersionSettings.agent;

        let agent_info = await this.mongoRepo.GetOneByQuery(
            { _teamId: this.mongoRepo.ObjectIdFromString(_teamId), machineId: machineId },
            'agent',
            {}
        );
        if (agent_info) {
            agentVersion = agent_info['targetVersion'];
        } else {
            if (existingTeam.pricingTier == TeamPricingTier.FREE) {
                let numAgents = 0;
                let agentsFilter: any = {};
                agentsFilter['_teamId'] = new mongodb.ObjectId(_teamId);

                let numAgentsQuery = await AgentModel.aggregate([{ $match: agentsFilter }, { $count: 'num_agents' }]);
                if (_.isArray(numAgentsQuery) && numAgentsQuery.length > 0) numAgents = numAgentsQuery[0].num_agents;

                const freeTierSettings = await settingsService.findSettings('FreeTierLimits');
                if (numAgents >= freeTierSettings.maxAgents) {
                    response.data = '';
                    response.statusCode = ResponseCode.FORBIDDEN;
                    return next();
                }
            }
        }
        const agentVersionMongo = agentVersion.split('.').join('_');

        // First check if we have information in mongo for this team/platform/arch agent install
        const platformKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}`;

        let queryPlatform = {};
        queryPlatform[platformKey] = { $exists: true };

        let queryStatus = {};
        const statusKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}.status`;
        queryStatus[statusKey] = { $eq: 'ready' };

        let projectionDoc = {};
        const locationKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}.location`;
        projectionDoc[locationKey] = 1;
        projectionDoc['_id'] = 1;

        const agent_install_details = await this.mongoRepo.GetOneByQuery(
            {
                $and: [{ Type: 'AgentBuild' }, queryPlatform, queryStatus],
            },
            'settings',
            projectionDoc
        );

        // Now check if the install exists in the specified s3 path
        if (agent_install_details != null) {
            try {
                let agentS3Path =
                    agent_install_details['Values']['agent_install'][agentVersionMongo][`${platform}${arch}`][
                        'location'
                    ];
                let agentInstallExists = await this.s3Access.objectExists(
                    agentS3Path,
                    config.get('S3_BUCKET_AGENT_BINARIES')
                );
                if (!agentInstallExists) {
                    logger.LogWarning('Path to agent from mongo does not exist in s3', {
                        Platform: platform,
                        Arch: arch,
                        S3Path: agentS3Path,
                    });
                    let queryCreateEmpty = {};
                    queryCreateEmpty[platformKey] = {};
                    await this.mongoRepo.Update(
                        'settings',
                        { _id: agent_install_details['_id'] },
                        { $set: queryCreateEmpty }
                    );
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
                return next();
            }
        }

        response.data = '';
        response.statusCode = ResponseCode.NOT_AVAILABLE;
        return next();
    }
}

export const agentDownloadRouterSingleton = new AgentDownloadRouter();
export const agentDownloadRouter = agentDownloadRouterSingleton.router;
