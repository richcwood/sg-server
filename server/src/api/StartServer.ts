import express = require('express');
import { NextFunction, Request, Response } from 'express';
import path = require('path');
import util = require('util');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
const compression = require('compression');
const multer = require('multer');
import * as config from 'config';
import { MongoRepo } from '../shared/MongoLib';
import * as mongodb from 'mongodb';
import { BaseLogger } from '../shared/SGLogger';
import LoginRouter from './routes/LoginRouter';
const jwt = require('jsonwebtoken');
import * as mongoose from 'mongoose';
import { teamRouter } from './routes/TeamRouter';
import { agentRouter } from './routes/AgentRouter';
import { agentDownloadRouter } from './routes/AgentDownloadRouter';
import { agentLogRouter } from './routes/AgentLogRouter';
import { scriptRouter } from './routes/ScriptRouter';
import { scheduleRouter } from './routes/ScheduleRouter';
import { jobRouter } from './routes/JobRouter';
import { jobDefRouter } from './routes/JobDefRouter';
import { taskDefRouter } from './routes/TaskDefRouter';
import { stepDefRouter } from './routes/StepDefRouter';
import { taskRouter } from './routes/TaskRouter';
import { taskOutcomeRouter } from './routes/TaskOutcomeRouter';
import { stepOutcomeRouter } from './routes/StepOutcomeRouter';
import { userRouter } from './routes/UserRouter';
import GitHookRouter from './routes/GitHookRouter';
import BraintreeHookRouter from './routes/BraintreeHookRouter';
import { handleErrors } from './utils/ErrorMiddleware';
import { handleBuildResponseWrapper, handleResponse, handleStartTimer } from './utils/ResponseMiddleware';
import { stepRouter } from './routes/StepRouter';
import { teamStorageRouter } from './routes/TeamStorageRouter';
import { paymentTransactionRouter } from './routes/PaymentTransactionRouter';
import { braintreeClientTokenRouter } from './routes/BraintreeClientTokenRouter';
import { invoiceRouter } from './routes/InvoiceRouter';
import { signupRouter } from './routes/SignupRouter';
import { teamInviteRouter } from './routes/TeamInviteRouter';
import { joinTeamRouter } from './routes/JoinTeamRouter';
import { passwordResetRouter } from './routes/PasswordResetRouter';
import { ForgotPasswordRouter } from './routes/ForgotPasswordRouter';
import { taskActionRouter } from './routes/TaskActionRouter';
import { taskOutcomeActionRouter } from './routes/TaskOutcomeActionRouter';
import { jobActionRouter } from './routes/JobActionRouter';
import { teamVariableRouter } from './routes/TeamVariableRouter';
import { artifactRouter } from './routes/ArtifactRouter';
import { payInvoiceAutoRouter } from './routes/PayInvoiceAutoRouter';
import { payInvoiceManualRouter } from './routes/PayInvoiceManualRouter';
import { createInvoiceRouter } from './routes/CreateInvoiceRouter';
import { updateTeamStorageUsageRouter } from './routes/UpdateTeamStorageUsageRouter';
import { userScriptShadowCopyRouter } from './routes/UserScriptShadowCopyRouter';
const IPCIDR = require('ip-cidr');
import { read } from 'fs';
import { JobStatus } from '../shared/Enums';
import { UserSchema } from './domain/User';
import { userService } from './services/UserService';
import { ValidationError } from './utils/Errors';
import * as morgan from 'morgan';
import * as fs from 'fs';

// Create a new express application instance
const app: express.Application = express();

const appName = 'SaasGlueAPI';

mongoose.connect(config.get('mongoUrl'), { useNewUrlParser: true });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

class AppBuilder {

  constructor(private readonly app) {
    this.setUpMiddleware();
    this.setUpRoutes();
    app.use(handleErrors);
    app.use(handleResponse);
  }

  private setUpMiddleware() {
    app.disable('etag');

    if(config.get('httpLogs.enabled')){
      morgan.token('user_id', req => req.headers.userid);
      morgan.token('user_email', req => req.headers.email);
      morgan.token('team_id', req => req.headers._teamid);
      morgan.token('transaction_id', req => req['transactionId'] ? req['transactionId'] : '-');

      // const logsDirectory = path.join(__dirname, config.get('logsFolder'));
      // if (!fs.existsSync(logsDirectory)){
      //   fs.mkdirSync(logsDirectory);
      // }

      // const logFilePath: string = path.join(logsDirectory, config.get('httpLogs.fileName'));
      // const accessLogStream: fs.WriteStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      app.use(morgan(config.get('httpLogs.morganFormat')));
    }

    app.use(handleBuildResponseWrapper);
    // app.use(handleStartTimer);
    this.setUpClient();
    this.setUpLogger();
    this.setUpMongoLib();
  }

  private setUpClient() {
    // setup gzip / deflate for static resources and REST api responses
    app.use(compression({
      filter: (req: Request, resp: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        else {
          return true;
        }
      }
    }));

    app.use(express.static(path.join(__dirname, '../../../clientv3/dist')));
  }

  private setUpLogger() {
    let logger: BaseLogger = new BaseLogger(appName);
    logger.Start();
    this.app.use((req, res, next) => {
      req.logger = logger;
      next();
    });
  }

  private setUpMongoLib() {
    const mongoUrl = config.get('mongoUrl');
    const mongoDbName = config.get('mongoDbName');
    // not sure if this is the best way to share a mongo lib but I think it will work OK
    // if requests need unique mongo libs I can just create a new one every request I guess
    this.app.use((req, res, next) => {
      const mongoLib = new MongoRepo(appName, mongoUrl, mongoDbName, req.logger);
      req.mongoLib = mongoLib;
      next();
    });
  }

  private setUpRoutes(): void {
    const apiURLBase = '/api/v0';

    this.app.use(`/login`, new LoginRouter().router);

    this.app.use(`${apiURLBase}/githook`, new GitHookRouter().router);
    this.app.use(`${apiURLBase}/braintreehook`, new BraintreeHookRouter().router);
    this.app.use(`${apiURLBase}/signup`, signupRouter);

    this.setUpJwtSecurity();

    // Simple check for browser to validate the Auth cookie
    this.app.get('/securecheck', async (req: Request, res: Response, next: NextFunction) => {
      // Write back the cookie to refresh it with a new life and to let the client know
      // if they were invited to new teams, joined new teams etc.
      const userId = new mongodb.ObjectId(req.headers.userid);
      const user: UserSchema = <UserSchema>await userService.findUser(userId, 'id passwordHash email teamIds teamIdsInvited name companyName');

      const jwtExpiration = Date.now() + (1000 * 60 * 60 * 24); // 1 day
      const secret = config.get('secret');
      var token = jwt.sign({
        id: user._id,
        email: user.email,
        teamIds: user.teamIds,
        teamIdsInvited: user.teamIdsInvited,
        name: user.name,
        companyName: user.companyName,
        exp: Math.floor(jwtExpiration / 1000)
      }, secret);//KeysUtil.getPrivate()); // todo - create a public / private key

      res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
      res.send('OK');
    });

    this.app.use(`${apiURLBase}/team`, teamRouter);
    this.app.use(`${apiURLBase}/agentDownload`, agentDownloadRouter);
    this.app.use(`${apiURLBase}/agent`, agentRouter);
    this.app.use(`${apiURLBase}/agentlog`, agentLogRouter);
    this.app.use(`${apiURLBase}/script`, scriptRouter);
    this.app.use(`${apiURLBase}/schedule`, scheduleRouter);
    this.app.use(`${apiURLBase}/job`, jobRouter);
    this.app.use(`${apiURLBase}/task`, taskRouter);
    this.app.use(`${apiURLBase}/step`, stepRouter);
    this.app.use(`${apiURLBase}/taskoutcome`, taskOutcomeRouter);
    this.app.use(`${apiURLBase}/stepoutcome`, stepOutcomeRouter);
    this.app.use(`${apiURLBase}/jobdef`, jobDefRouter);
    this.app.use(`${apiURLBase}/taskdef`, taskDefRouter);
    this.app.use(`${apiURLBase}/stepdef`, stepDefRouter);
    this.app.use(`${apiURLBase}/user`, userRouter);
    // this.app.use(`${apiURLBase}/paymentmethod`, paymentMethodRouter);
    this.app.use(`${apiURLBase}/payinvoiceauto`, payInvoiceAutoRouter);
    this.app.use(`${apiURLBase}/payinvoicemanual`, payInvoiceManualRouter);
    this.app.use(`${apiURLBase}/paymenttoken`, braintreeClientTokenRouter);
    this.app.use(`${apiURLBase}/paymenttransaction`, paymentTransactionRouter);
    this.app.use(`${apiURLBase}/invoice`, invoiceRouter);
    this.app.use(`${apiURLBase}/invite`, teamInviteRouter);
    this.app.use(`${apiURLBase}/join`, joinTeamRouter);
    this.app.use(`${apiURLBase}/reset`, passwordResetRouter);
    this.app.use(`${apiURLBase}/forgot`, ForgotPasswordRouter);
    this.app.use(`${apiURLBase}/taskaction`, taskActionRouter);
    this.app.use(`${apiURLBase}/taskoutcomeaction`, taskOutcomeActionRouter);
    this.app.use(`${apiURLBase}/jobaction`, jobActionRouter);
    this.app.use(`${apiURLBase}/teamvar`, teamVariableRouter);
    this.app.use(`${apiURLBase}/teamstorage`, teamStorageRouter);
    this.app.use(`${apiURLBase}/artifact`, artifactRouter);
    this.app.use(`${apiURLBase}/createinvoice`, createInvoiceRouter);
    this.app.use(`${apiURLBase}/updateteamstorageusage`, updateTeamStorageUsageRouter);
    this.app.use(`${apiURLBase}/scriptshadow`, userScriptShadowCopyRouter);
  }

  private setUpJwtSecurity(): void {
    app.use((req, res, next) => {
      const logger: BaseLogger = (<any>req).logger;
      // // simple development
      // req.headers._teamid = '5d2f857e5a47381334ab3fab';
      // next();
      // return;

      logger.LogDebug('Received new request', { path: req.path, method: req.method, headers: req.headers, params: req.params, body: req.body });
      // console.log('req.headers -> ', util.inspect(req.headers, false, null));
      // console.log('req.params -> ', util.inspect(req.params, false, null));

      // if(res.statusCode !== undefined){
      //   // if status code is set, another middleware function already handled this request
      //   return next();
      // }

      if (req.method === 'POST' && req.path.match('/api/v[0-9]+/signup')) {
        next();
        return;
      }
      else if (req.method === 'PUT' && req.path.match('/api/v[0-9]+/signup/details')) {
        next();
        return;
      }
      else if (req.method === 'PUT' && req.path.match('/api/v[0-9]+/signup/confirm')) {
        next();
        return;
      }
      else if (req.method === 'GET' && req.path.match('/api/v[0-9]+/join/invite')) {
        next();
        return;
      } else if ((req.method === 'POST' || req.method === 'GET') && req.path.match('/api/v[0-9]+/reset')) {
        next();
        return;
      } else if (req.method === 'POST' && req.path.match('/api/v[0-9]+/forgot')) {
        next();
        return;
      } else if (req.method === 'POST' && req.path.match('/api/v[0-9]+/invite/shared')) {
        next();
        return;
      } else if (req.method === 'PUT' && req.path.match('/api/v[0-9]+/user')) {
        if (!req.headers.auth && !req.cookies.Auth) {
          res.status(403).send('Redirect to login - no Auth cookie');
        } else {
          /// TODO: prevent user from modifying properties like teamIds, etc.
          const authToken = req.headers.auth ? req.headers.auth : req.cookies.Auth;
          const secret = config.get('secret');
          const jwtData = jwt.verify(authToken, secret);

          const params = req.originalUrl.split('/');
          const paramUserId = params[4];
          if (paramUserId != jwtData.id) {
            res.status(403).send('Redirect to login - no access to requested user');
          } else {
            console.log('setUpJwtSecurity -> jwtData -> ', util.inspect(jwtData, false, null));
            next();
            return;
          }
        }
      } else {
        if (!req.headers.auth && !req.cookies.Auth) {
          res.status(403).send('Redirect to login - no Auth cookie');
        } else {
          const authToken = req.headers.auth ? req.headers.auth : req.cookies.Auth;
          try {
            // todo - use the private key here
            // todo - verify the team id was sent in the request header
            // todo - verify the team id is in the JWT tokens teamIds array
            const secret = config.get('secret');
            const jwtData = jwt.verify(authToken, secret);
            // logger.LogDebug('New request jwtData', { jwtData });
            // console.log('setUpJwtSecurity -> jwtData -> ', util.inspect(jwtData, false, null));

            req.headers.userid = jwtData.id;
            req.headers.email = jwtData.email;
            req.headers.teamIds = jwtData.teamIds;

            if ('agentStubVersion' in jwtData) {
              // todo: access rights - agents should have restricted access - for now, full
              // the agent stub should only have access to get the agent
              // the agent should get its own jwt which should have the agent id and the team id embedded - 
              //  then we can check the embedded team id with the team id in the request header and the 
              //  the team id in the database to make sure they match - agent access should also be restricted
              //  should we rotate the agent jwt tokens?
              if (!req.headers._teamid) {
                next(new ValidationError('Missing _teamId in header'));
              } else if (req.headers.teamIds.indexOf((<any>req).headers._teamid) === -1) {
                next(new ValidationError(`Access denied`));
              }
              next();
              return;
            }

            // console.log(`${req.headers.email}, you have access to teams ${req.headers.teamIds}`);
            // console.log(`${req.headers.email}, you are trying to access team ${req.headers._teamid}`);
            // console.log('req -> path -> ', req.path);
            // console.log('req -> method -> ', req.method);

            let teamAccess: boolean = false;
            if (req.method === 'GET' && req.path.match('/api/v[0-9]+/join/shared_invite')) {
              next();
              return;
            }
            else if (req.method === 'GET' && req.path.match('/securecheck')) {
              teamAccess = true;
            }
            else if ((req.method === 'POST' || req.method === 'GET') && req.path.match('/api/v[0-9]+/team')) {
              teamAccess = true;
            } else {
              if ((req.headers.email === 'scheduler@saasglue.com') || (req.headers.email === 'admin@saasglue.com')) {
                teamAccess = true;
                let remoteAddress = req.socket.remoteAddress;
                // console.log(`remoteAddress -> ${remoteAddress}`);
                // if (jwtData.ipV6) {
                //   if (jwtData.ipV6 != remoteAddress) {
                //     teamAccess = false;
                //   }
                // }
                // if (!teamAccess) {
                //   remoteAddress = req.socket.remoteAddress.replace(/^.*:/, '');
                //   const cidr = new IPCIDR(jwtData.ipRange);
                //   console.log(`cidr -> ${cidr}`);
                //   if (!cidr.contains(remoteAddress)) {
                //     teamAccess = false;
                //   } else {
                //     teamAccess = true;
                //   }
                // }
              } else if (req.headers.teamIds.indexOf((<any>req).headers._teamid) !== -1) {
                teamAccess = true;
              }
            }

            if (!teamAccess) {
              logger.LogError(`${req.headers.email}, access denied to team ${req.headers._teamid}`, { '_teamId': req.headers._teamid });
              // console.log(`${req.headers.email}, access denied to team ${req.headers._teamid}`);
              res.status(403).send('Redirect to login - no access to requested team');
            }
            else {
              // console.log('next');
              next();
            }
          }
          catch (err) {
            logger.LogError(err.message, { Error: err, Headers: req.headers, Body: req.body, Params: req.params });
            // console.log(err);
            res.status(403).send('Redirect to login - Auth cookie not verified');
          }
        }
      }
    });
  }

  private checkRequest(): void {
    app.use((req, res, next) => {
      console.log(util.inspect(req, false, null));
      next();
    });
  }
}

new AppBuilder(app);




const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log(`API listening on port ${port}!`);
});

