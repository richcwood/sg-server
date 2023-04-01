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

const mongoUrl = config.get('mongoUrl');
const mongoDbName = config.get('mongoDbName');
const environment = config.get('environment');

let appName: string = 'AgentDownloadRouter';
let mongoLogger: BaseLogger = new BaseLogger(appName);
mongoLogger.Start();

const validPlatforms: string[] = ['freebsd', 'linux', 'alpine', 'macos', 'win'];
const validArchitectures: string[] = ['x64', 'x86', 'armv6', 'armv7'];

export class AgentDownloadRouter {
    public readonly router: Router;
    private s3Access: S3Access;
    private mongoRepo: MongoRepo;

    constructor() {
        this.s3Access = new S3Access();
        this.mongoRepo = new MongoRepo(appName, mongoUrl, mongoDbName, mongoLogger);

        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.post(
            '/agent/:version/:platform/:arch?',
            verifyAccessRights(['AGENT_DOWNLOAD_CREATE', 'GLOBAL']),
            this.createAgent.bind(this)
        );
        this.router.post(
            '/agentstub/:platform/:arch?',
            verifyAccessRights(['AGENT_DOWNLOAD_CREATE', 'GLOBAL']),
            this.createAgentStub.bind(this)
        );
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
            next(new ValidationError('Missing or invalid platform param'));
            // res.status(422).send('Missing or invalid platform param');
            return;
        }

        let arch: string = <string>req.params.arch;
        if (!arch) {
            arch = '';
        } else {
            if ((platform == 'macos' || platform == 'linux') && arch == 'x64') {
                arch = '';
            } else {
                if (validArchitectures.indexOf(arch) < 0) {
                    next(new ValidationError('Invalid arch param'));
                    // res.status(422).send('Invalid arch param');
                    return;
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
                    next();
                    return;
                }
            } catch (e) {
                next(e);
                return;
            }
        }

        response.data = '';
        response.statusCode = ResponseCode.NOT_AVAILABLE;
        next();

        let createAgentStubUrl = `agentDownload/agentstub/${platform}`;
        if (arch) createAgentStubUrl += `/${arch}`;

        await localRestAccess.RestAPICall(createAgentStubUrl, 'POST', _teamId, null, null, req.cookies.Auth);
    }

    // Create an agent download stub
    async createAgentStub(req: Request, res: Response, next: NextFunction) {
        const _teamId: string = <string>req.headers._teamid;
        const logger: BaseLogger = (<any>req).logger;
        const response: ResponseWrapper = res['body'];

        const platform: string = <string>req.params.platform;
        if (validPlatforms.indexOf(platform) < 0) {
            next(new ValidationError('Missing or invalid platform param'));
            return;
        }

        let arch: string = <string>req.params.arch;
        if (!arch) {
            arch = '';
        } else {
            if (validArchitectures.indexOf(arch) < 0) {
                next(new ValidationError('Invalid arch param'));
                return;
            }
        }

        const agentVersionSettings = await settingsService.findSettings('AgentVersion');
        let agentStubVersion = agentVersionSettings.agentStub;

        // logger.LogInfo('Create agent stub called', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch });

        // Run a query which will return null if we have an active agent stub or create information for the requested agent
        //  stub with the status defaulted to "creating" in a single atomic operation - if the current status is "creating" and
        //  the AGENT_CREATE_TIMEOUT period is exceeded a new agent will be created
        const platformKey = `Values.agent_stub_install.${platform}${arch}`;
        const statusKey = `Values.agent_stub_install.${platform}${arch}.status`;
        const versionKey = `Values.agent_stub_install.${platform}${arch}.version`;
        const lastUpdateTimeKey = `Values.agent_stub_install.${platform}${arch}.lastUpdateTime`;

        // response.data = '';
        // response.statusCode = ResponseCode.OK;
        // next();

        let queryPlatformNotExists = {};
        queryPlatformNotExists[platformKey] = { $exists: false };

        let queryStatusNotExists = {};
        queryStatusNotExists[statusKey] = { $exists: false };

        let queryLastUpdateTimeNotExists = {};
        queryLastUpdateTimeNotExists[lastUpdateTimeKey] = { $exists: false };

        // let queryStatusCreating = {};
        // queryStatusCreating[statusKey] = { $eq: 'creating' };

        let queryStatusError = {};
        queryStatusError[statusKey] = { $eq: 'error' };

        let queryCurrentAgentStubVersion = {};
        queryCurrentAgentStubVersion[versionKey] = { $ne: agentStubVersion };

        // let queryAgentCreateTimeout = {};
        // const agentCreateTimeout = new Date().getTime() - parseInt(config.get('AGENT_CREATE_TIMEOUT'), 10) * 1000;
        // queryAgentCreateTimeout[lastUpdateTimeKey] = { $lt: agentCreateTimeout };

        // let s3Path = `agent-stub/${environment}/${_teamId}/${platform}${arch}/${agentStubVersion}/sg-agent-launcher`;
        // if (platform == 'win')
        //   s3Path += '.exe';
        // s3Path += '.gz';
        let queryUpdate = {};
        const lastUpdateTime = new Date().getTime();
        queryUpdate[platformKey] = {
            status: 'creating',
            lastUpdateTime: lastUpdateTime,
            message: '',
            version: agentStubVersion,
        };

        const agentBuildUpdate: any = await this.mongoRepo.Update(
            'settings',
            {
                $and: [
                    { Type: 'AgentBuild' },
                    {
                        $or: [
                            { agent_stub_install: { $exists: false } },
                            queryPlatformNotExists,
                            queryStatusNotExists,
                            queryLastUpdateTimeNotExists,
                            queryStatusError,
                            queryCurrentAgentStubVersion,
                        ],
                    },
                ],
            },
            { $set: queryUpdate },
            { _id: 1 }
        );

        if (agentBuildUpdate != null && agentBuildUpdate.lastErrorObject.updatedExisting) {
            try {
                let data = {
                    name: `BuildAgentStub - ${platform}${arch} - ${agentStubVersion}`,
                    runtimeVars: {
                        agentVersion: agentStubVersion,
                        platform: platform,
                        arch: arch,
                    },
                };
                let jobDefId = config.get('buildAgentStubJobDefId');
                if (platform == 'win') jobDefId = config.get('buildAgentStubWinx64JobDefId');
                await localRestAccess.RestAPICall(
                    'job',
                    'POST',
                    config.get('sgAdminTeam'),
                    { _jobDefId: jobDefId },
                    data
                );
            } catch (err) {
                logger.LogInfo(`Error creating agent stub: ${err}`, {
                    Platform: platform,
                    Arch: arch,
                    Version: agentStubVersion,
                });
                queryUpdate[platformKey]['status'] = 'error';
                queryUpdate[platformKey]['location'] = '';
                queryUpdate[platformKey]['message'] = err.message;
                await this.mongoRepo.Update(
                    'settings',
                    { _id: agentBuildUpdate['_id'] },
                    { $set: queryUpdate },
                    { _id: 1 }
                );

                // if (fs.existsSync(out_path))
                //   fse.removeSync(out_path);
                next(err);
                return;
            }

            // let stubPath = createAgentStubRes;
            // let compressedStubPath = await SGUtils.GzipFile(stubPath);
            // let ret = await this.s3Access.uploadFile(compressedStubPath, s3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
            // logger.LogInfo(`AgentStub ${agentStubVersion} loaded from ${stubPath} to ${s3Path}`, {});
            // // todo: delete local agent install files after upload to s3

            // // Update the agent stub status in mongo to "ready"
            // let queryStatus = {};
            // queryStatus[statusKey] = 'ready'
            // await this.mongoRepo.Update('team', { _id: this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryStatus });
            // logger.LogInfo('Create agent stub success', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentStubVersion });

            response.data = '';
            response.statusCode = ResponseCode.NOT_AVAILABLE;
            next();
        } else {
            // logger.LogInfo('Create agent stub called but agent stub already exists', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentStubVersion });

            const queryProjection: any = {};
            queryProjection[platformKey] = 1;
            const agentBuild = await this.mongoRepo.GetById(agentBuildUpdate['_id'], 'settings', queryProjection);
            if (agentBuild['Values.agent_stub_install'][platform + arch]['status'] == 'creating') {
                response.data = '';
                response.statusCode = ResponseCode.NOT_AVAILABLE;
                next();
            } else {
                response.data = '';
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
    }

    // Create an agent download
    async createAgent(req: Request, res: Response, next: NextFunction) {
        // const _teamId: string = <string>req.headers._teamid;
        const logger: BaseLogger = (<any>req).logger;
        const response: ResponseWrapper = res['body'];

        const agentVersion: string = <string>req.params.version;
        if (!agentVersion.match(/v\d+\.\d+\.\d+\.\d+/g)) {
            next(new ValidationError(`Invalid version param "${agentVersion}" - should be formatted as "vx.x.x.x"`));
            return;
        }
        const agentVersionMongo = agentVersion.split('.').join('_');

        const platform: string = <string>req.params.platform;
        if (validPlatforms.indexOf(platform) < 0) {
            next(new ValidationError('Missing or invalid platform param'));
            return;
        }

        let arch: string = <string>req.params.arch;
        if (!arch) {
            arch = '';
        } else {
            if (validArchitectures.indexOf(arch) < 0) {
                next(new ValidationError('Invalid arch param'));
                return;
            }
        }

        // logger.LogInfo('Create agent called', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'AgentVersion': agentVersion });

        // Run a query which will return null if we have an active agent install or create information for the requested agent
        //  install with the status defaulted to "creating" in a single atomic operation - if the current status is "creating" and
        //  the AGENT_CREATE_TIMEOUT period is exceeded a new agent will be created
        const platformKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}`;
        const statusKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}.status`;
        const lastUpdateTimeKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}.lastUpdateTime`;

        // response.data = '';
        // response.statusCode = ResponseCode.OK;
        // next();

        let queryPlatformNotExists = {};
        queryPlatformNotExists[platformKey] = { $exists: false };

        let queryStatusNotExists = {};
        queryStatusNotExists[statusKey] = { $exists: false };

        let queryLastUpdateTimeNotExists = {};
        queryLastUpdateTimeNotExists[lastUpdateTimeKey] = { $exists: false };

        // let queryStatusCreating = {};
        // queryStatusCreating[statusKey] = { $eq: 'creating' };

        let queryStatusError = {};
        queryStatusError[statusKey] = { $eq: 'error' };

        // let queryAgentCreateTimeout = {};
        // const agentCreateTimeout = new Date().getTime() - parseInt(config.get('AGENT_CREATE_TIMEOUT'), 10) * 1000;
        // queryAgentCreateTimeout[lastUpdateTimeKey] = { $lt: agentCreateTimeout };

        // let s3Path = `agent/${environment}/${_teamId}/${platform}${arch}/${agentVersion}/sg-agent`;
        // if (platform == 'win')
        //   s3Path += '.exe';
        // s3Path += '.gz';
        let queryUpdate = {};
        const lastUpdateTime = new Date().getTime();
        queryUpdate[platformKey] = { status: 'creating', lastUpdateTime: lastUpdateTime, message: '' };

        const agentBuildUpdate: any = await this.mongoRepo.Update(
            'settings',
            {
                $and: [
                    { Type: 'AgentBuild' },
                    {
                        $or: [
                            { agent_install: { $exists: false } },
                            queryPlatformNotExists,
                            queryStatusNotExists,
                            queryLastUpdateTimeNotExists,
                            queryStatusError,
                        ],
                    },
                ],
            },
            { $set: queryUpdate },
            { _id: 1 }
        );

        if (agentBuildUpdate != null && agentBuildUpdate.lastErrorObject.updatedExisting) {
            try {
                let data = {
                    name: `BuildAgent - ${platform}${arch} - ${agentVersion}`,
                    runtimeVars: {
                        agentVersion: agentVersion,
                        platform: platform,
                        arch: arch,
                    },
                };
                let jobDefId = config.get('buildAgentJobDefId');
                if (platform == 'win') jobDefId = config.get('buildAgentWinx64JobDefId');
                await localRestAccess.RestAPICall(
                    'job',
                    'POST',
                    config.get('sgAdminTeam'),
                    { _jobDefId: jobDefId },
                    data
                );
            } catch (err) {
                logger.LogInfo(`Error creating agent: ${err}`, {
                    Platform: platform,
                    Arch: arch,
                    Version: agentVersion,
                });
                queryUpdate[platformKey]['status'] = 'error';
                queryUpdate[platformKey]['location'] = '';
                queryUpdate[platformKey]['message'] = err.message;
                await this.mongoRepo.Update(
                    'settings',
                    { _id: agentBuildUpdate['_id'] },
                    { $set: queryUpdate },
                    { _id: 1 }
                );

                // if (fs.existsSync(out_path))
                //   fse.removeSync(out_path);
                next(err);
                return;
            }

            // let agentPath = createAgentRes;

            // let compressedStubPath = await SGUtils.GzipFile(agentPath);
            // let ret = await this.s3Access.uploadFile(compressedStubPath, s3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
            // logger.LogInfo(`Agent ${agentVersion} loaded from ${agentPath} to ${s3Path}`, {});
            // if (fs.existsSync(out_path))
            //   fse.removeSync(out_path);

            // // Update the agent status in mongo to "ready"
            // let queryStatus = {};
            // queryStatus[statusKey] = 'ready'
            // await this.mongoRepo.Update('team', { _id: this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryStatus });
            // logger.LogInfo('Build agent started', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentVersion });

            response.data = '';
            response.statusCode = ResponseCode.NOT_AVAILABLE;
            next();
        } else {
            // logger.LogInfo('Create agent called but agent already exists', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentVersion });

            const queryProjection: any = {};
            queryProjection[platformKey] = 1;
            const agentBuild = await this.mongoRepo.GetById(agentBuildUpdate['_id'], 'settings', queryProjection);
            if (agentBuild['Values.agent_install'][agentVersionMongo][platform + arch]['status'] == 'creating') {
                response.data = '';
                response.statusCode = ResponseCode.NOT_AVAILABLE;
                next();
            } else {
                response.data = '';
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
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
            next(new ValidationError(`Invalid team`));
            return;
        }

        const platform: string = <string>req.params.platform;
        if (validPlatforms.indexOf(platform) < 0) {
            next(new ValidationError('Missing or invalid platform param'));
            // res.status(422).send('Missing or invalid platform param');
            return;
        }

        let arch: string = <string>req.params.arch;
        if (!arch) {
            arch = '';
        } else {
            if ((platform == 'macos' || platform == 'linux') && arch == 'x64') {
                arch = '';
            } else {
                if (validArchitectures.indexOf(arch) < 0) {
                    next(new ValidationError('Invalid arch param'));
                    // res.status(422).send('Invalid arch param');
                    return;
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
                // if (platform == 'win')
                //   agentS3Path += '.exe';
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
