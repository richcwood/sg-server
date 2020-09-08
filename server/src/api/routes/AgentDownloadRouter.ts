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
    this.router.post('/agent/:version/:platform/:arch?', this.createAgent.bind(this)); // by the browser
    this.router.post('/agentstub/:platform/:arch?', this.createAgentStub.bind(this)); // by the browser
    this.router.get('/agent/:machineId/:platform/:arch?', this.downloadAgent.bind(this)); // by the browser
    this.router.get('/agentstub/:platform/:arch?', this.downloadAgentStub.bind(this)); // by the browser
  }


  verifyIsAgentStub(req: Request, res: Response, next: NextFunction) {
    // todo - check JWT for if it's an agent
    next();
  }


  // Returns 303 if agent stub install does not exist - otherwise returns 200 plus a signed url for direct s3 download
  async downloadAgentStub(req: Request, res: Response, next: NextFunction) {
    const _teamId: string = <string>req.headers._teamid;
    const logger: BaseLogger = (<any>req).logger;
    const response: ResponseWrapper = (res as any).body;

    const existingTeam = await teamService.findTeam(_teamId, 'id');
    if (!existingTeam) {
      response.data = '';
      response.statusCode = ResponseCode.NOT_FOUND;
      next(new MissingObjectError(`Team "${_teamId}" does not exist`));
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
      if (validArchitectures.indexOf(arch) < 0) {
        next(new ValidationError('Invalid arch param'));
        // res.status(422).send('Invalid arch param');
        return;
      }
    }

    // First check if we have information in mongo for this team/platform/arch stub install
    const platformKey = `agent_stub_install.${platform}${arch}`;

    let queryPlatform = {};
    queryPlatform[platformKey] = { $exists: true }

    let queryStatus = {};
    const statusKey = `agent_stub_install.${platform}${arch}.status`;
    queryStatus[statusKey] = { $eq: 'ready' };

    let projectionDoc = {};
    const locationKey = `agent_stub_install.${platform}${arch}.location`;
    projectionDoc[locationKey] = 1;

    const stub_install_details = await this.mongoRepo.GetOneByQuery({
      $and: [
        { '_id': this.mongoRepo.ObjectIdFromString(_teamId) },
        queryPlatform,
        queryStatus
      ]
    }, 'team', projectionDoc);

    // Now check if the install exists in the specified s3 path
    if (stub_install_details != null) {
      try {
        let stubS3Path = stub_install_details['agent_stub_install'][`${platform}${arch}`]['location'];
        // if (platform == 'win')
        //   stubS3Path += '.exe';
        let stubInstallExists = await this.s3Access.objectExists(stubS3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
        if (!stubInstallExists) {
          logger.LogWarning('Path to agent stub from mongo does not exist in s3', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'S3Path': stubS3Path });
          let queryCreateEmpty = {}
          queryCreateEmpty[platformKey] = {};
          await this.mongoRepo.Update('team', { '_id': this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryCreateEmpty });
        } else {
          const signedUrl = await this.s3Access.getSignedS3URL(stubS3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
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
    if (arch)
      createAgentStubUrl += `/${arch}`;

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

    logger.LogInfo('Create agent stub called', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch });

    // Run a query which will return null if we have an active agent stub or create information for the requested agent 
    //  stub with the status defaulted to "creating" in a single atomic operation - if the current status is "creating" and 
    //  the AGENT_CREATE_TIMEOUT period is exceeded a new agent will be created
    const platformKey = `agent_stub_install.${platform}${arch}`;
    const statusKey = `agent_stub_install.${platform}${arch}.status`;
    const lastUpdateTimeKey = `agent_stub_install.${platform}${arch}.lastUpdateTime`;

    response.data = '';
    response.statusCode = ResponseCode.OK;
    next();

    let queryPlatformNotExists = {};
    queryPlatformNotExists[platformKey] = { $exists: false }

    let queryStatusNotExists = {};
    queryStatusNotExists[statusKey] = { $exists: false }

    let queryLastUpdateTimeNotExists = {};
    queryLastUpdateTimeNotExists[lastUpdateTimeKey] = { $exists: false }

    let queryStatusNotReady = {};
    queryStatusNotReady[statusKey] = { $eq: 'creating' };

    let queryAgentCreateTimeout = {};
    const agentCreateTimeout = new Date().getTime() - parseInt(config.get('AGENT_CREATE_TIMEOUT'), 10) * 1000;
    queryAgentCreateTimeout[lastUpdateTimeKey] = { $lt: agentCreateTimeout };

    // let s3Path = `agent-stub/${environment}/${_teamId}/${platform}${arch}/${agentStubVersion}/sg-agent-launcher`;
    // if (platform == 'win')
    //   s3Path += '.exe';
    // s3Path += '.gz';
    let queryUpdate = {};
    const lastUpdateTime = new Date().getTime();
    queryUpdate[platformKey] = { 'status': 'creating', 'lastUpdateTime': lastUpdateTime };

    const team: any = await this.mongoRepo.Update('team', {
      $and: [
        { '_id': this.mongoRepo.ObjectIdFromString(_teamId) },
        {
          $or: [
            { agent_stub_install: { $exists: false } },
            queryPlatformNotExists,
            queryStatusNotExists,
            queryLastUpdateTimeNotExists,
            { $and: [queryStatusNotReady, queryAgentCreateTimeout] }
          ]
        }
      ]
    }, { $set: queryUpdate }, { _id: 1 });

    if ((team != null) && (team.lastErrorObject.updatedExisting)) {
      // Create the agent stub install and upload it to s3
      // let out_path = `/tmp/sg-agent-stub-install/`;
      // let createAgentStubRes;
      try {
        // createAgentStubRes = await this.CreateAgentStubInstall(_teamId, agentStubVersion, 'node10', platform, arch, out_path, logger);
        let data = {
          name: `BuildAgentStub - ${_teamId} - ${platform}${arch} - ${agentStubVersion}`,
          runtimeVars: {
            teamId: _teamId,
            agentVersion: agentStubVersion,
            platform: platform,
            arch: arch,
            secret: config.get("secret")
          }
        };
        let jobDefId = config.get('buildAgentStubJobDefId');
        if (platform == 'win')
          jobDefId = config.get('buildAgentStubWinx64JobDefId');
        await localRestAccess.RestAPICall('job', 'POST', config.get("sgAdminTeam"), { _jobDefId: jobDefId }, data);
      } catch (err) {
        logger.LogInfo(`Error creating agent stub: ${err}`, { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, Version: agentStubVersion, team });
        queryUpdate[platformKey]['status'] = 'error';
        queryUpdate[platformKey]['location'] = '';
        queryUpdate[platformKey]['message'] = err.message;
        await this.mongoRepo.Update('team', { '_id': this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryUpdate }, { _id: 1 });

        // if (fs.existsSync(out_path))
        //   fse.removeSync(out_path);
        return;
      }

      // let stubPath = createAgentStubRes;
      // let compressedStubPath = await SGUtils.GzipFile(stubPath);
      // let ret = await this.s3Access.uploadFileToS3(compressedStubPath, s3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
      // logger.LogInfo(`AgentStub ${agentStubVersion} loaded from ${stubPath} to ${s3Path}`, {});
      // // todo: delete local agent install files after upload to s3

      // // Update the agent stub status in mongo to "ready"
      // let queryStatus = {};
      // queryStatus[statusKey] = 'ready'
      // await this.mongoRepo.Update('team', { _id: this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryStatus });
      logger.LogInfo('Create agent stub success', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentStubVersion });
    } else {
      logger.LogInfo('Create agent stub called but agent stub already exists', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentStubVersion });
    }

    // Rich todo Happens in StartServer.ts jwt ...
    //https://www.npmjs.com/package/express-jwt

    // const result = {
    //   team: req.body._teamId,
    //   team: req.headers._teamId
    // }

    // res.download('./server/src/api/routes/ml-workshop.zip');
    //res.json(result);
  }


  /// ******************** Create agent installer for team ******************** ////
  async CreateAgentStubInstall(_teamId: string, agentStubVersion: string, nodeRange: string, platform: string, arch: string, out_path: string, logger: BaseLogger) {
    let apiUrl = config.get('API_BASE_URL');
    const apiPort = config.get('API_PORT');
    let logDest = config.get('logDest');

    let queryRes: any = await this.mongoRepo.GetOneByQuery({ 'Type': 'APIVersion' }, 'settings', { 'Values.agentLogs': 1 });
    let agentLogsAPIVersion = queryRes.Values.agentLogs;


    const secret = config.get('secret');
    var token = jwt.sign({
      teamIds: [_teamId],
      agentStubVersion: agentStubVersion
    }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key


    let pkg_json = {
      "name": "sg-agent-launcher",
      "version": "1.0.0",
      "description": "Saas glue agent launcher",
      "keywords": [],
      "author": "",
      "license": "ISC",
      "pkg": {
        "assets": [
          "default.json"
        ]
      }
    };

    let cfg_json = {
      "_teamId": _teamId,
      "apiUrl": apiUrl,
      "apiPort": apiPort,
      "agentLogsAPIVersion": agentLogsAPIVersion,
      "token": token,
      "agentPlatform": platform,
      "agentArch": arch,
      "logDest": logDest,
      "env": environment
    };

    const fse = require("fs-extra");
    const fs = require("fs");

    // let out_path = `.`;
    await fse.ensureDir(out_path);
    out_path += SGUtils.makeid(10);

    const url = `https://${config.get('SG_GIT_USERNAME')}:${config.get('SG_GIT_PASSWORD')}@${config.get('SG_GIT_URL')}`;

    await fse.remove(out_path);
    const cmdClone = `git clone --branch ${agentStubVersion} --depth 1 ${url} ${out_path}/`;
    logger.LogInfo(`Cloning git repo`, { 'Method': 'CreateAgentInstall', 'Command': cmdClone });
    let cloneRes: any = await SGUtils.RunCommand(cmdClone, {});
    if (cloneRes.code != 0)
      throw new Error(cloneRes.stderr);

    await SGUtils.RunCommand(`npm i`, { cwd: out_path + '/agent' });

    out_path += '/agent/dist';
    const pkg_path = `${out_path}/pkg_agent_stub`;
    await fse.ensureDir(pkg_path);
    fs.writeFileSync(pkg_path + '/package.json', JSON.stringify(pkg_json, null, 4), 'utf-8');
    fs.writeFileSync(pkg_path + '/default.json', JSON.stringify(cfg_json, null, 4), 'utf-8');

    let target = `${nodeRange}-${platform}`;
    if (arch != '')
      target += `-${arch}`;

    let res = await exec([`${out_path}/LaunchAgentStub.js`, '--config', pkg_path + '/package.json', '--targets', target, '--out-path', pkg_path]);

    let outFileName = `${pkg_path}/sg-agent-launcher`;
    if (platform == 'win')
      outFileName += '.exe';

    return outFileName;
  }


  /// ******************** Create agent for team ******************** ////
  async CreateAgentInstall(_teamId: string, agentVersion: string, nodeRange: string, platform: string, arch: string, token: any, out_path: string, logger: BaseLogger) {
    let apiUrl = config.get('API_BASE_URL');
    const apiPort = config.get('API_PORT');
    let logDest = config.get('logDest');

    let queryRes: any = await this.mongoRepo.GetOneByQuery({ 'Type': 'APIVersion' }, 'settings', { 'Values.agentLogs': 1 });
    let agentLogsAPIVersion = queryRes.Values.agentLogs;

    let pkg_json = {
      "name": "sg-agent",
      "version": "1.0.0",
      "description": "Saas glue agent",
      "keywords": [],
      "author": "",
      "license": "ISC",
      "pkg": {
        "assets": [
          "default.json"
        ]
      }
    };

    let cfg_json = {
      "apiUrl": apiUrl,
      "apiPort": apiPort,
      "agentLogsAPIVersion": agentLogsAPIVersion,
      "token": token,
      "_teamId": _teamId,
      "env": environment,
      logDest: logDest
    };

    const fse = require("fs-extra");
    const fs = require("fs");

    // let out_path = `.`;
    await fse.ensureDir(out_path);
    out_path += SGUtils.makeid();

    const url = `https://${config.get('SG_GIT_USERNAME')}:${config.get('SG_GIT_PASSWORD')}@${config.get('SG_GIT_URL')}`;

    await fse.remove(out_path);
    const cmdClone = `git clone --branch ${agentVersion} --depth 1 ${url} ${out_path}/`;
    logger.LogInfo(`Cloning git repo`, { 'Method': 'CreateAgentInstall', 'Command': cmdClone });
    let cloneRes: any = await SGUtils.RunCommand(cmdClone, {});
    if (cloneRes.code != 0)
      throw new Error(cloneRes.stderr);

    await SGUtils.RunCommand(`npm i`, { cwd: out_path + '/agent' });

    out_path += '/agent/dist';
    const pkg_path = `${out_path}/pkg_agent`;
    await fse.ensureDir(pkg_path);
    fs.writeFileSync(pkg_path + '/package.json', JSON.stringify(pkg_json, null, 4), 'utf-8');
    fs.writeFileSync(pkg_path + '/default.json', JSON.stringify(cfg_json, null, 4), 'utf-8');

    let target = `${nodeRange}-${platform}`;
    if (arch != '')
      target += `-${arch}`;

    let res = await exec([`${out_path}/LaunchAgent.js`, '--config', pkg_path + '/package.json', '--targets', target, '--out-path', pkg_path]);

    let outFileName = `${pkg_path}/sg-agent`;
    if (platform == 'win')
      outFileName += '.exe';

    return outFileName;
  };


  // Create an agent download
  async createAgent(req: Request, res: Response, next: NextFunction) {
    const _teamId: string = <string>req.headers._teamid;
    const logger: BaseLogger = (<any>req).logger;
    const response: ResponseWrapper = res['body'];

    const agentVersion: string = <string>req.params.version;
    if (!(agentVersion.match(/v\d+\.\d+\.\d+\.\d+/g))) {
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

    logger.LogInfo('Create agent called', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'AgentVersion': agentVersion });

    // Run a query which will return null if we have an active agent install or create information for the requested agent 
    //  install with the status defaulted to "creating" in a single atomic operation - if the current status is "creating" and 
    //  the AGENT_CREATE_TIMEOUT period is exceeded a new agent will be created
    const platformKey = `agent_install.${agentVersionMongo}.${platform}${arch}`;
    const statusKey = `agent_install.${agentVersionMongo}.${platform}${arch}.status`;
    const lastUpdateTimeKey = `agent_install.${agentVersionMongo}.${platform}${arch}.lastUpdateTime`;

    response.data = '';
    response.statusCode = ResponseCode.OK;
    next();

    let queryPlatformNotExists = {};
    queryPlatformNotExists[platformKey] = { $exists: false }

    let queryStatusNotExists = {};
    queryStatusNotExists[statusKey] = { $exists: false }

    let queryLastUpdateTimeNotExists = {};
    queryLastUpdateTimeNotExists[lastUpdateTimeKey] = { $exists: false }

    let queryStatusNotReady = {};
    queryStatusNotReady[statusKey] = { $eq: 'creating' };

    let queryAgentCreateTimeout = {};
    const agentCreateTimeout = new Date().getTime() - parseInt(config.get('AGENT_CREATE_TIMEOUT'), 10) * 1000;
    queryAgentCreateTimeout[lastUpdateTimeKey] = { $lt: agentCreateTimeout };

    // let s3Path = `agent/${environment}/${_teamId}/${platform}${arch}/${agentVersion}/sg-agent`;
    // if (platform == 'win')
    //   s3Path += '.exe';
    // s3Path += '.gz';
    let queryUpdate = {};
    const lastUpdateTime = new Date().getTime();
    queryUpdate[platformKey] = { 'status': 'creating', 'lastUpdateTime': lastUpdateTime };

    const team: any = await this.mongoRepo.Update('team', {
      $and: [
        { '_id': this.mongoRepo.ObjectIdFromString(_teamId) },
        {
          $or: [
            { agent_install: { $exists: false } },
            queryPlatformNotExists,
            queryStatusNotExists,
            queryLastUpdateTimeNotExists,
            { $and: [queryStatusNotReady, queryAgentCreateTimeout] }
          ]
        }
      ]
    }, { $set: queryUpdate }, { _id: 1 });

    if ((team != null) && (team.lastErrorObject.updatedExisting)) {
      // Create the agent install and upload it to s3
      // let out_path = `/tmp/sg-agent-install/`;
      // let createAgentRes;
      try {
        // createAgentRes = await this.CreateAgentInstall(_teamId, agentVersion, 'node10', platform, arch, req.cookies.Auth, out_path, logger);
        let data = {
          name: `BuildAgent - ${_teamId} - ${platform}${arch} - ${agentVersion}`,
          runtimeVars: {
            teamId: _teamId,
            agentVersion: agentVersion,
            platform: platform,
            arch: arch,
            secret: config.get("secret")
          }
        };
        let jobDefId = config.get('buildAgentJobDefId');
        if (platform == 'win')
          jobDefId = config.get('buildAgentWinx64JobDefId');
        await localRestAccess.RestAPICall('job', 'POST', config.get("sgAdminTeam"), { _jobDefId: jobDefId }, data);
      } catch (err) {
        logger.LogInfo(`Error creating agent: ${err}`, { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, Version: agentVersion, team });
        queryUpdate[platformKey]['status'] = 'error';
        queryUpdate[platformKey]['location'] = '';
        queryUpdate[platformKey]['message'] = err.message;
        await this.mongoRepo.Update('team', { '_id': this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryUpdate }, { _id: 1 });

        // if (fs.existsSync(out_path))
        //   fse.removeSync(out_path);
        return;
      }

      // let agentPath = createAgentRes;

      // let compressedStubPath = await SGUtils.GzipFile(agentPath);
      // let ret = await this.s3Access.uploadFileToS3(compressedStubPath, s3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
      // logger.LogInfo(`Agent ${agentVersion} loaded from ${agentPath} to ${s3Path}`, {});
      // if (fs.existsSync(out_path))
      //   fse.removeSync(out_path);


      // // Update the agent status in mongo to "ready"
      // let queryStatus = {};
      // queryStatus[statusKey] = 'ready'
      // await this.mongoRepo.Update('team', { _id: this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryStatus });
      logger.LogInfo('Build agent started', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentVersion });
    } else {
      logger.LogInfo('Create agent called but agent already exists', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'version': agentVersion });
    }

    // Rich todo Happens in StartServer.ts jwt ...
    //https://www.npmjs.com/package/express-jwt

    // const result = {
    //   team: req.body._teamId,
    //   team: req.headers._teamId
    // }

    // res.download('./server/src/api/routes/ml-workshop.zip');
    //res.json(result);
  }


  // Returns 303 if agent install does not exist - otherwise returns 200 plus a signed url for direct s3 download
  async downloadAgent(req: Request, res: Response, next: NextFunction) {
    const _teamId: string = <string>req.headers._teamid;
    const logger: BaseLogger = (<any>req).logger;
    const machineId: string = <string>req.params.machineId;
    const response: ResponseWrapper = (res as any).body;

    const existingTeam = await teamService.findTeam(_teamId, 'pricingTier');
    if (!existingTeam) {
      response.data = '';
      response.statusCode = ResponseCode.NOT_FOUND;
      next(new MissingObjectError(`Team "${_teamId}" does not exist`));
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
      if (validArchitectures.indexOf(arch) < 0) {
        next(new ValidationError('Invalid arch param'));
        // res.status(422).send('Invalid arch param');
        return;
      }
    }

    const agentVersionSettings = await settingsService.findSettings('AgentVersion');
    let agentVersion = agentVersionSettings.agent;

    let agent_info = await this.mongoRepo.GetOneByQuery({ '_teamId': this.mongoRepo.ObjectIdFromString(_teamId), 'machineId': machineId }, 'agent', {});
    if (agent_info) {
      agentVersion = agent_info['targetVersion'];
    } else {
      if (existingTeam.pricingTier == TeamPricingTier.FREE) {
        let numAgents = 0;
        let agentsFilter: any = {};
        agentsFilter['_teamId'] = new mongodb.ObjectId(_teamId);

        let numAgentsQuery = await AgentModel.aggregate([
          { $match: agentsFilter },
          { $count: 'num_agents' }
        ]);
        if (_.isArray(numAgentsQuery) && numAgentsQuery.length > 0)
          numAgents = numAgentsQuery[0].num_agents;

        const freeTierSettings = await settingsService.findSettings('FreeTierLimits');
        if (numAgents >= freeTierSettings.maxAgents) {
          response.data = '';
          response.statusCode = ResponseCode.FORBIDDEN;
          next();
          return;
        }
      }
    }
    const agentVersionMongo = agentVersion.split('.').join('_');

    // First check if we have information in mongo for this team/platform/arch agent install
    const platformKey = `agent_install.${agentVersionMongo}.${platform}${arch}`;

    let queryPlatform = {};
    queryPlatform[platformKey] = { $exists: true }

    let queryStatus = {};
    const statusKey = `agent_install.${agentVersionMongo}.${platform}${arch}.status`;
    queryStatus[statusKey] = { $eq: 'ready' };

    let projectionDoc = {};
    const locationKey = `agent_install.${agentVersionMongo}.${platform}${arch}.location`;
    projectionDoc[locationKey] = 1;

    const agent_install_details = await this.mongoRepo.GetOneByQuery({
      $and: [
        { '_id': this.mongoRepo.ObjectIdFromString(_teamId) },
        queryPlatform,
        queryStatus
      ]
    }, 'team', projectionDoc);

    // Now check if the install exists in the specified s3 path
    if (agent_install_details != null) {
      try {
        let agentS3Path = agent_install_details['agent_install'][agentVersionMongo][`${platform}${arch}`]['location'];
        // if (platform == 'win')
        //   agentS3Path += '.exe';
        let agentInstallExists = await this.s3Access.objectExists(agentS3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
        if (!agentInstallExists) {
          logger.LogWarning('Path to agent from mongo does not exist in s3', { '_teamId': _teamId, 'Platform': platform, 'Arch': arch, 'S3Path': agentS3Path });
          let queryCreateEmpty = {}
          queryCreateEmpty[platformKey] = {};
          await this.mongoRepo.Update('team', { '_id': this.mongoRepo.ObjectIdFromString(_teamId) }, { $set: queryCreateEmpty });
        } else {
          const signedUrl = await this.s3Access.getSignedS3URL(agentS3Path, config.get('S3_BUCKET_AGENT_BINARIES'));
          response.data = signedUrl;
          response.statusCode = ResponseCode.OK;
          next();
          return;
        }
      } catch (e) {
        next();
        return;
      }
    }

    response.data = '';
    response.statusCode = ResponseCode.NOT_AVAILABLE;
    next();

    let createAgentUrl = `agentDownload/agent/${agentVersion}/${platform}`;
    if (arch)
      createAgentUrl += `/${arch}`;

    await localRestAccess.RestAPICall(createAgentUrl, 'POST', _teamId, null, null, req.cookies.Auth);
  }
}

export const agentDownloadRouterSingleton = new AgentDownloadRouter();
export const agentDownloadRouter = agentDownloadRouterSingleton.router;