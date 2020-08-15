import { NextFunction, Request, Response, Router } from 'express';
import * as util from 'util';
import * as mongodb from 'mongodb';
import { MongoRepo } from '../../shared/MongoLib';
import { userService } from '../services/UserService';
import { teamService } from '../services/TeamService';
import { TeamSchema } from '../domain/Team';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
import KeysUtil from '../KeysUtil';
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
    // todo - an API login that will act a bit differently but still return a JWT
  }

  async webLogin(req: Request, res: Response, next: NextFunction) {
    const mongoLib: MongoRepo = (<any>req).mongoLib;

    // How to generate a bycrpted password 
    // todo - use this code when you generate users in the system
    // const salt = await bcrypt.genSalt(10);
    // console.log('salt is ', salt);
    // const passwordHash = await bcrypt.hash(req.body.password, salt);
    // console.log('passwordHash is ', passwordHash);

    // todo - any chance of sql injection here?
    // const loginResults: any = await mongoLib.GetOneByQuery({email: req.body.email}, 'user', {});
    const loginResults: any = await userService.findAllUsersInternal({ email: req.body.email }, 'id passwordHash email teamIds teamIdsInvited name companyName')
    
    if (!loginResults || (_.isArray(loginResults) && loginResults .length < 1)) {
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
        email: loginResult.email,
        teamIds: loginResult.teamIds,
        teamIdsInvited: loginResult.teamIdsInvited,
        name: loginResult.name,
        companyName: loginResult.companyName,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

      res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
      const relatedTeams = await teamService.findAllTeamsInternal({ _id: { $in: loginResult.teamIds.map(id => new mongodb.ObjectId(id)) } });
      // const relatedTeams = await mongoLib.GetManyByQuery({ _id: { $in: loginResult.teamIds.map(id => new mongodb.ObjectId(id)) } }, 'team', {});

      // todo - dynmically fetch stomp user data
      const loginData = {
        // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
        config1: loginResult.email,
        config2: convertResponseData(TeamSchema, relatedTeams),
        config3: loginResult._id
        // config3: 'wss://user:pass@funny-finch.rmq.cloudamqp.com/ws/stomp',
        // config4: 'bart',
        // config5: 'happy'
      };

      res.send(loginData);
    }
    else {
      res.status(401).send('Authentication failed');
    }
  }

  // todo - Have a seperate login for API users
  // the Auth token won't be a cookie
  async apiLogin(req: Request, res: Response, next: NextFunction) {
    const mongoLib: MongoRepo = (<any>req).mongoLib;

    // How to generate a bycrpted password 
    // todo - use this code when you generate users in the system
    // const salt = await bcrypt.genSalt(10);
    // console.log('salt is ', salt);
    // const passwordHash = await bcrypt.hash(req.body.password, salt);
    // console.log('passwordHash is ', passwordHash);

    console.log('req.body -> ', req.body);

    // todo - any chance of sql injection here?
    const loginResults: any = await mongoLib.GetOneByQuery({ email: req.body.email }, 'user', {});

    console.log('loginResults -> ', loginResults);

    if (await bcrypt.compare(req.body.password, loginResults.passwordHash)) {
      console.log('success');
      // Create a JWT
      const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // x minute(s)

      const secret = config.get('secret');
      var token = jwt.sign({
        id: loginResults._id,
        email: loginResults.email,
        teamIds: loginResults.teamIds,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

      console.log('jwt token -> ', JSON.stringify(token));

      // todo - secure: true
      res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
      let relatedTeams: string = '';
      if (loginResults.teamIds)
        relatedTeams = <string>await mongoLib.GetManyByQuery({ _id: { $in: loginResults.teamIds.map(id => new mongodb.ObjectId(id)) } }, 'team', {});

      // todo - dynmically fetch stomp user data
      const loginData = {
        // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
        config1: loginResults.email,
        config2: relatedTeams
        // config3: 'wss://user:pass@funny-finch.rmq.cloudamqp.com/ws/stomp',
        // config4: 'bart',
        // config5: 'happy'
      };

      res.send(loginData);
    }
    else {
      console.log('fail');
      res.status(401).send('Authentication failed');
    }
  }
};
