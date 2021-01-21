import { NextFunction, Request, Response, Router } from 'express';
import * as util from 'util';
import * as mongodb from 'mongodb';
// import { MongoRepo } from '../../shared/MongoLib';
import { userService } from '../services/UserService';
import { teamService } from '../services/TeamService';
import { TeamSchema } from '../domain/Team';
import { UserSchema } from '../domain/User';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { AuthTokenType } from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';
import { accessKeyService } from '../services/AccessKeyService';
import { convertTeamAccessRightsToBitset } from '../utils/Shared';


const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
import * as _ from 'lodash';
import * as config from 'config';


export default class LoginRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.setRoutes();
  }

  setRoutes() {
    this.router.post('/weblogin', this.webLogin.bind(this));
    this.router.post('/apiLogin', this.apiLogin.bind(this));
    this.router.post('/refreshtoken', this.refreshToken.bind(this));
    // todo - an API login that will act a bit differently but still return a JWT
  }

  async webLogin(req: Request, res: Response, next: NextFunction) {
    const loginResults: any = await userService.findAllUsersInternal({ email: req.body.email }, 'id passwordHash email teamIds teamIdsInvited name companyName teamAccessRightIds')

    if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
      res.status(401).send('Authentication failed');
      return;
    }

    const loginResult = loginResults[0];

    if (await bcrypt.compare(req.body.password, loginResult.passwordHash)) {
      // Create a JWT
      const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // x minute(s)

      const secret = config.get('secret');
      var token = jwt.sign({
        id: loginResult._id,
        type: AuthTokenType.USER,
        email: loginResult.email,
        teamIds: loginResult.teamIds,
        teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(loginResult),
        teamIdsInvited: loginResult.teamIdsInvited,
        name: loginResult.name,
        companyName: loginResult.companyName,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

      res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
      const relatedTeams = await teamService.findAllTeamsInternal({ _id: { $in: loginResult.teamIds.map(id => new mongodb.ObjectId(id)) } });

      const loginData = {
        // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
        config1: loginResult.email,
        config2: convertResponseData(TeamSchema, relatedTeams),
        config3: loginResult._id
      };

      res.send(loginData);
    }
    else {
      res.status(401).send('Authentication failed');
    }
  }


  async apiLogin(req: Request, res: Response, next: NextFunction) {
    const logger: BaseLogger = (<any>req).logger;
    try {
      const loginResults: any = await accessKeyService.findAllAccessKeysInternal({ accessKeyId: req.body.accessKeyId, accessKeySecret: req.body.accessKeySecret }, '_teamId expiration revokeTime accessRightIds')
      // console.log(`authenticating api access for client id ${req.body.accessKeyId}`);

      if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
        res.status(401).send('Authentication failed');
        return;
      }

      const loginResult = loginResults[0];

      if (loginResult.expiration < new Date() || loginResult.revokeTime < new Date()) {
        res.status(401).send('Authentication failed');
        return;
      }

      let teamAccessRightIds = {}
      teamAccessRightIds[loginResult._teamId] = convertTeamAccessRightsToBitset(loginResult.accessRightIds);

      const secret = config.get('secret');

      // Create a refresh JWT
      const refreshJwtExpiration = Date.now() + (1000 * 60 * 60 * 24 * 7); // 1 week
      var refreshToken = jwt.sign({
        id: loginResult._id,
        type: AuthTokenType.REFRESHKEY,
        accessKeyId: req.body.accessKeyId,
        exp: Math.floor(refreshJwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key
  
      // Create an api JWT
      const jwtExpiration = Date.now() + (1000 * 60 * 10); // 10 minute(s)
      var token = jwt.sign({
        id: loginResult._id,
        type: AuthTokenType.ACCESSKEY,
        accessKeyId: req.body.accessKeyId,
        expiration: loginResult.expiration,
        teamIds: [loginResult._teamId],
        teamAccessRightIds: teamAccessRightIds,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

      const loginData = {
        // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
        config1: loginResult._id,
        config2: refreshToken
      };

      await accessKeyService.updateAccessKey(new mongodb.ObjectId(loginResult._teamId), new mongodb.ObjectId(loginResult._id), { lastUsed: new Date() });

      res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
      res.send(loginData);
    } catch (err) {
      logger.LogError(err.message, { Error: err, Url: req.url, Headers: req.headers, Body: req.body, Params: req.params });
      // console.log(err);
      res.status(401).send('Authentication failed');
    }
  }


  async refreshToken(req: Request, res: Response, next: NextFunction) {
    const logger: BaseLogger = (<any>req).logger;
    const authToken = req.headers.auth ? req.headers.auth : req.cookies.Auth;
    let jwtData;
    try {
      const secret = config.get('secret');
      jwtData = jwt.verify(authToken, secret);

      if (jwtData.type != AuthTokenType.REFRESHKEY) {
        res.status(401).send('Authentication failed');
        return;
      }

      const loginResults: any = await accessKeyService.findAllAccessKeysInternal({ accessKeyId: jwtData.accessKeyId }, '_teamId expiration revokeTime accessRightIds')
      // console.log(`authenticating api access for client id ${req.body.accessKeyId}`);
  
      if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
        res.status(401).send('Authentication failed');
        return;
      }
  
      const loginResult = loginResults[0];
  
      if (loginResult.expiration < new Date() || loginResult.revokeTime < new Date()) {
        res.status(401).send('Authentication failed');
        return;
      }
    
      let teamAccessRightIds = {}
      teamAccessRightIds[loginResult._teamId] = convertTeamAccessRightsToBitset(loginResult.accessRightIds);
  
      // Create a refresh JWT
      const refreshJwtExpiration = Date.now() + (1000 * 60 * 60 * 24 * 7); // 1 week
      var refreshToken = jwt.sign({
        id: loginResult._id,
        type: AuthTokenType.REFRESHKEY,
        accessKeyId: req.body.accessKeyId,
        exp: Math.floor(refreshJwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key
  
      // Create an api JWT
      const jwtExpiration = Date.now() + (1000 * 60 * 10); // 10 minute(s)
      var token = jwt.sign({
        id: loginResult._id,
        type: AuthTokenType.ACCESSKEY,
        accessKeyId: req.body.accessKeyId,
        expiration: loginResult.expiration,
        teamIds: [loginResult._teamId],
        teamAccessRightIds: teamAccessRightIds,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key
  
      const loginData = {
        // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
        config1: loginResult._id,
        config2: refreshToken
      };
  
      await accessKeyService.updateAccessKey(new mongodb.ObjectId(loginResult._teamId), new mongodb.ObjectId(loginResult._id), {lastUsed: new Date()});
  
      res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
      res.send(loginData);
    } catch (err) {
      res.status(401).send('Authentication failed');
      return;
    }
  }
};
