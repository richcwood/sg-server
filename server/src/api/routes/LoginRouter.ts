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
import { authenticateApiAccess } from '../../api/utils/Shared';
import { BaseLogger } from '../../shared/SGLogger';

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
    let [token, jwtExpiration, loginData] = await authenticateApiAccess(req.body.accessKeyId, req.body.accessKeySecret, logger);

    if (!token) {
      res.status(401).send('Authentication failed');
      return;
    }

    res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
    res.send(loginData);
  }
};
