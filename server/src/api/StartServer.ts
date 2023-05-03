const environment = process.env.NODE_ENV || 'development';
const appName = 'SaaSGlueAPI';

import { MetricsLogger } from './utils/MetricsLogger';
MetricsLogger.init();

import express = require('express');
import { NextFunction, Request, Response } from 'express';
const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const enforce = require('express-sslify');
const IPCIDR = require('ip-cidr');
const jwt = require('jsonwebtoken');
const multer = require('multer');
import path = require('path');
const redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
import util = require('util');

import { UserSchema } from './domain/User';

import { accessKeyRouter } from './routes/AccessKeyRouter';
import { accessRightRouter } from './routes/AccessRightRouter';
import { agentRouter } from './routes/AgentRouter';
import { agentDownloadRouter } from './routes/AgentDownloadRouter';
import { agentLogRouter } from './routes/AgentLogRouter';
import { artifactRouter } from './routes/ArtifactRouter';
import { createInvoiceRouter } from './routes/CreateInvoiceRouter';
import { forgotPasswordRouter } from './routes/ForgotPasswordRouter';
import GitHookRouter from './routes/GitHookRouter';
import { handleErrors } from './utils/ErrorMiddleware';
import { invoiceRouter } from './routes/InvoiceRouter';
import { jobActionRouter } from './routes/JobActionRouter';
import { jobDefRouter } from './routes/JobDefRouter';
import { jobRouter } from './routes/JobRouter';
import { joinTeamRouter } from './routes/JoinTeamRouter';
import LoginRouter from './routes/LoginRouter';
import { payInvoiceAutoRouter } from './routes/PayInvoiceAutoRouter';
import { payInvoiceManualRouter } from './routes/PayInvoiceManualRouter';
import { paymentMethodRouter } from './routes/PaymentMethodRouter';
import { passwordResetRouter } from './routes/PasswordResetRouter';
import { paymentTransactionRouter } from './routes/PaymentTransactionRouter';
import { handleBuildResponseWrapper, handleResponse, handleStartTimer } from './utils/ResponseMiddleware';
import { read } from 'fs';
import { saascipeRouter } from './routes/SaascipeRouter';
import { saascipeVersionRouter } from './routes/SaascipeVersionRouter';
import { scheduleRouter } from './routes/ScheduleRouter';
import { scriptRouter } from './routes/ScriptRouter';
import { settingsRouter } from './routes/SettingsRouter';
import { signupRouter } from './routes/SignupRouter';
import { stepDefRouter } from './routes/StepDefRouter';
import { stepOutcomeRouter } from './routes/StepOutcomeRouter';
import { stepRouter } from './routes/StepRouter';
import { stripeClientTokenRouter } from './routes/StripClientTokenRouter';
import StripeWebhookRouter from './routes/StripeWebhookRouter';
import { taskActionRouter } from './routes/TaskActionRouter';
import { taskDefRouter } from './routes/TaskDefRouter';
import { taskOutcomeActionRouter } from './routes/TaskOutcomeActionRouter';
import { taskOutcomeRouter } from './routes/TaskOutcomeRouter';
import { taskRouter } from './routes/TaskRouter';
import { teamAdminAccessRouter } from './routes/TeamAdminAccessRouter';
import { teamInviteRouter } from './routes/TeamInviteRouter';
import { teamRouter } from './routes/TeamRouter';
import { teamStorageRouter } from './routes/TeamStorageRouter';
import { teamVariableRouter } from './routes/TeamVariableRouter';
import { updateTeamStorageUsageRouter } from './routes/UpdateTeamStorageUsageRouter';
import { userRouter } from './routes/UserRouter';
import { userScriptShadowCopyRouter } from './routes/UserScriptShadowCopyRouter';

import { userService } from './services/UserService';

import { AMQPConnector } from '../shared/AMQPLib';
import { AuthTokenType } from '../shared/Enums';
import { SecretsLoader } from '../shared/SecretsManager';
import { BaseLogger } from '../shared/SGLogger';

import { ValidationError } from './utils/Errors';

import * as config from 'config';
import * as dotenv from 'dotenv';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';
import * as morgan from 'morgan';

let logger: BaseLogger;

(async () => {
    logger = new BaseLogger(appName);
    logger.Start();

    if (environment === 'production') {
        const secretConfigs = config.get('secrets');
        for (let secretConfig of secretConfigs) {
            await SecretsLoader.loadSecrets(secretConfig, logger);
        }
    } else {
        dotenv.config();
    }

    // Create a new express application instance
    const app: express.Application = express();

    var options = {
        autoIndex: false, // Don't build indexes
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        // If not connected, return errors immediately rather than waiting for reconnect
        // bufferMaxEntries: 0
    };

    mongoose.connect(process.env.mongoUrl, options);

    const redisClient = redis.createClient(process.env.redisUrl, { no_ready_check: true });

    let amqp: AMQPConnector = new AMQPConnector(appName, '', 1, (activeMessages) => {}, logger);
    amqp.Start();

    const expressSessionOptions: any = {
        store: new RedisStore({ client: redisClient }),
        saveUninitialized: false,
        secret: process.env.sessionSecret,
        resave: false,
        cookie: {},
    };
    if (environment === 'production') {
        expressSessionOptions.cookie.secure = true;
    }
    app.use(session(expressSessionOptions));

    app.use(`/api/v0/stripewebhook`, bodyParser.raw({ type: '*/*' }), new StripeWebhookRouter().router);

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

            if (
                environment != 'debug' &&
                environment !== 'bartdev' &&
                environment !== 'richdev' &&
                environment !== 'dev_k8s'
            ) {
                this.app.use(enforce.HTTPS({ trustProtoHeader: true }));
            }

            const validOrigins = [
                'http://console.saasglue.com',
                'https://console.saasglue.com',
                'http://saasglue.com',
                'https://saasglue.com',
                'http://www.saasglue.com',
                'https://www.saasglue.com',
            ];

            const stripPortRegex = /(?<baseUrl>http[s]?:\/\/[^:]+)/;

            const isValidOrigin = (origin) => {
                try {
                    const baseUrl = origin.match(stripPortRegex).groups['baseUrl'];
                    return validOrigins.indexOf(baseUrl) !== -1;
                } catch (err) {
                    return false; // something weird we don't recognize, just fail it
                }
            };

            if (environment == 'stage') {
                validOrigins.push('http://saasglue-stage.herokuapp.com');
            } else if (
                environment === 'bartdev' ||
                environment === 'debug' ||
                environment === 'richdev' ||
                environment === 'dev_k8s'
            ) {
                validOrigins.push('http://localhost');
            }

            const corsOptions: any = {
                origin: (origin, callback) => {
                    if (!origin || isValidOrigin(origin)) {
                        callback(null, true);
                    } else {
                        callback(new Error(`Hey silly! ${origin} is just not allowed!`));
                    }
                },
                methods: 'GET, PUT, POST, DELETE, OPTIONS',
                allowedHeaders:
                    'origin, x-requested-with, accept, content-type, x-csrf-token, correlationid, cookie, auth, host, referer, user-agent, _teamid',
                exposedHeaders:
                    'origin, x-requested-with, accept, content-type, x-csrf-token, correlationid, cookie, auth, referer, user-agent, _teamid',
                maxAge: 3628800,
                credentials: true,
            };
            if (environment != 'richdev') {
                app.use(cors(corsOptions));
            }

            if (config.get('httpLogs.enabled')) {
                morgan.token('user_id', (req) => req.headers.userid);
                morgan.token('user_email', (req) => req.headers.email);
                morgan.token('team_id', (req) => req.headers._teamid);
                morgan.token('transaction_id', (req) => (req['transactionId'] ? req['transactionId'] : '-'));

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
            this.setUpAmqp();
        }

        private setUpClient() {
            // setup gzip / deflate for static resources and REST api responses
            app.use(
                compression({
                    filter: (req: Request, resp: Response) => {
                        if (req.headers['x-no-compression']) {
                            return false;
                        } else {
                            return true;
                        }
                    },
                })
            );

            app.use(express.static(path.join(__dirname, '../../../clientv3/dist')));
        }

        private setUpLogger() {
            this.app.use((req, res, next) => {
                req.logger = logger;
                next();
            });
        }

        private setUpAmqp() {
            this.app.use((req, res, next) => {
                req.amqp = amqp;
                next();
            });
        }

        private setUpRoutes(): void {
            const apiURLBase = '/api/v0';

            this.app.use(`/login`, new LoginRouter().router);

            this.app.use(`${apiURLBase}/githook`, new GitHookRouter().router);

            this.setUpJwtSecurity();

            // Simple check for browser to validate the Auth cookie
            this.app.get('/securecheck', async (req: Request, res: Response, next: NextFunction) => {
                // Write back the cookie to refresh it with a new life and to let the client know
                // if they were invited to new teams, joined new teams etc.
                const userId = new mongodb.ObjectId(<string>req.headers.userid);
                const user: UserSchema = <UserSchema>(
                    await userService.findUser(
                        userId,
                        'id passwordHash email teamIds teamIdsInvited name companyName teamAccessRightIds'
                    )
                );

                const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // 1 day
                const secret = process.env.secret;
                var token = jwt.sign(
                    {
                        id: user._id,
                        email: user.email,
                        teamIds: user.teamIds,
                        teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(user),
                        teamIdsInvited: user.teamIdsInvited,
                        name: user.name,
                        companyName: user.companyName,
                        exp: Math.floor(jwtExpiration / 1000),
                    },
                    secret
                ); //KeysUtil.getPrivate()); // todo - create a public / private key

                res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
                res.send('OK');
            });

            this.app.use(`${apiURLBase}/accesskey`, accessKeyRouter);
            this.app.use(`${apiURLBase}/accessright`, accessRightRouter);
            this.app.use(`${apiURLBase}/agent`, agentRouter);
            this.app.use(`${apiURLBase}/agentDownload`, agentDownloadRouter());
            this.app.use(`${apiURLBase}/agentlog`, agentLogRouter);
            this.app.use(`${apiURLBase}/artifact`, artifactRouter);
            this.app.use(`${apiURLBase}/createinvoice`, createInvoiceRouter);
            this.app.use(`${apiURLBase}/forgot`, forgotPasswordRouter);
            this.app.use(`${apiURLBase}/invoice`, invoiceRouter);
            this.app.use(`${apiURLBase}/invite`, teamInviteRouter);
            this.app.use(`${apiURLBase}/job`, jobRouter);
            this.app.use(`${apiURLBase}/jobaction`, jobActionRouter);
            this.app.use(`${apiURLBase}/jobdef`, jobDefRouter);
            this.app.use(`${apiURLBase}/join`, joinTeamRouter);
            this.app.use(`${apiURLBase}/payinvoiceauto`, payInvoiceAutoRouter);
            this.app.use(`${apiURLBase}/payinvoicemanual`, payInvoiceManualRouter);
            this.app.use(`${apiURLBase}/paymentmethod`, paymentMethodRouter);
            this.app.use(`${apiURLBase}/paymenttoken`, stripeClientTokenRouter);
            this.app.use(`${apiURLBase}/paymenttransaction`, paymentTransactionRouter);
            this.app.use(`${apiURLBase}/reset`, passwordResetRouter);
            this.app.use(`${apiURLBase}/schedule`, scheduleRouter);
            this.app.use(`${apiURLBase}/saascipe`, saascipeRouter);
            this.app.use(`${apiURLBase}/saascipeversion`, saascipeVersionRouter);
            this.app.use(`${apiURLBase}/script`, scriptRouter);
            this.app.use(`${apiURLBase}/scriptshadow`, userScriptShadowCopyRouter);
            this.app.use(`${apiURLBase}/settings`, settingsRouter);
            this.app.use(`${apiURLBase}/signup`, signupRouter);
            this.app.use(`${apiURLBase}/step`, stepRouter);
            this.app.use(`${apiURLBase}/stepdef`, stepDefRouter);
            this.app.use(`${apiURLBase}/stepoutcome`, stepOutcomeRouter);
            this.app.use(`${apiURLBase}/task`, taskRouter);
            this.app.use(`${apiURLBase}/taskaction`, taskActionRouter);
            this.app.use(`${apiURLBase}/taskdef`, taskDefRouter);
            this.app.use(`${apiURLBase}/taskoutcome`, taskOutcomeRouter);
            this.app.use(`${apiURLBase}/taskoutcomeaction`, taskOutcomeActionRouter);
            this.app.use(`${apiURLBase}/team`, teamRouter);
            this.app.use(`${apiURLBase}/teamadminaccess`, teamAdminAccessRouter);
            this.app.use(`${apiURLBase}/teamstorage`, teamStorageRouter);
            this.app.use(`${apiURLBase}/teamvar`, teamVariableRouter);
            this.app.use(`${apiURLBase}/updateteamstorageusage`, updateTeamStorageUsageRouter);
            this.app.use(`${apiURLBase}/user`, userRouter);
        }

        private setUpJwtSecurity(): void {
            app.use(async (req, res, next) => {
                const logger: BaseLogger = (<any>req).logger;
                // // simple development
                // req.headers._teamid = '5d2f857e5a47381334ab3fab';
                // next();
                // return;

                logger.LogDebug('Received new request', {
                    path: req.path,
                    method: req.method,
                    headers: req.headers,
                    params: req.params,
                    body: req.body,
                });
                // console.log('req.headers -> ', util.inspect(req.headers, false, null));
                // console.log('req.params -> ', util.inspect(req.params, false, null));

                // if(res.statusCode !== undefined){
                //   // if status code is set, another middleware function already handled this request
                //   return next();
                // }

                if (req.method === 'POST' && req.path.match('/api/v[0-9]+/signup[/]?$')) {
                    next();
                    return;
                } else if (req.method === 'POST' && req.path.match('/api/v[0-9]+/stripewebhook')) {
                    next();
                    return;
                }
                // else if (req.method === 'PUT' && req.path.match('/api/v[0-9]+/signup/details')) {
                //   next();
                //   return;
                // }
                else if (req.method === 'PUT' && req.path.match('/api/v[0-9]+/signup/confirm')) {
                    next();
                    return;
                } else if (req.method === 'GET' && req.path.match('/api/v[0-9]+/join/invite')) {
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
                } else if (req.method === 'GET' && req.path.match('/api/v[0-9]+/agentDownload/agentstub/')) {
                    next();
                    return;
                } else if (req.method === 'PUT' && req.path.match('/api/v[0-9]+/user')) {
                    if (!req.headers.auth && !req.cookies.Auth) {
                        res.status(403).send('Redirect to login - no Auth cookie');
                    } else {
                        /// TODO: prevent user from modifying properties like teamIds, etc.
                        const authToken = req.headers.auth ? req.headers.auth : req.cookies.Auth;
                        const secret = process.env.secret;
                        const jwtData = jwt.verify(authToken, secret);

                        const params = req.originalUrl.split('/');
                        const paramUserId = params[4];
                        if (paramUserId != jwtData.id) {
                            res.status(403).send('Redirect to login - no access to requested user');
                        } else {
                            // console.log('setUpJwtSecurity -> jwtData -> ', util.inspect(jwtData, false, null));
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
                            const secret = process.env.secret;
                            let jwtData;
                            try {
                                jwtData = jwt.verify(authToken, secret);
                            } catch (err) {
                                if (err.name == 'TokenExpiredError') {
                                    jwtData = jwt.decode(authToken);
                                    if (jwtData.type == AuthTokenType.ACCESSKEY) {
                                        next(new ValidationError('The access token expired'));
                                        return;
                                    }
                                } else if (
                                    err.name == 'JsonWebTokenError' &&
                                    process.env.old_secret &&
                                    process.env.old_secret_expiration
                                ) {
                                    if (new Date() < new Date(process.env.old_secret_expiration)) {
                                        jwtData = jwt.verify(authToken, process.env.old_secret);
                                    } else {
                                        throw err;
                                    }
                                } else {
                                    throw err;
                                }
                            }
                            // logger.LogDebug('New request jwtData', { jwtData });
                            // console.log('setUpJwtSecurity -> jwtData -> ', util.inspect(jwtData, false, null));

                            req.headers.userid = jwtData.id;
                            req.headers.email = jwtData.email;
                            req.headers.teamIds = jwtData.teamIds;
                            req.headers.teamAccessRightIds = jwtData.teamAccessRightIds;

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
                            } else if (req.method === 'GET' && req.path.match('/securecheck')) {
                                teamAccess = true;
                            } else if (
                                req.method === 'PUT' &&
                                req.path.match(/api\/v[0-9]+\/signup\/(details|oauth)\/[a-f\d]{24}$/i)
                            ) {
                                next();
                                return;
                            } else if (
                                (req.method === 'POST' || req.method === 'GET') &&
                                req.path.match('/api/v[0-9]+/team')
                            ) {
                                teamAccess = true;
                            } else {
                                if (
                                    req.headers.email === 'scheduler@saasglue.com' ||
                                    req.headers.email === 'admin@saasglue.com'
                                ) {
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
                                } else if (req.headers.teamIds.indexOf(process.env.sgAdminTeam) !== -1) {
                                    teamAccess = true;
                                }
                            }

                            if (!teamAccess) {
                                logger.LogError(`${req.headers.email}, access denied to team ${req.headers._teamid}`, {
                                    _teamId: req.headers._teamid,
                                });
                                // console.log(`${req.headers.email}, access denied to team ${req.headers._teamid}`);
                                res.status(403).send('Redirect to login - no access to requested team');
                            } else {
                                // console.log('next');
                                next();
                            }
                        } catch (err) {
                            logger.LogError(err.message, {
                                Error: err,
                                Url: req.url,
                                Headers: req.headers,
                                Body: req.body,
                                Params: req.params,
                            });
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
})();
