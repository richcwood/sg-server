import { NextFunction, Request, Response, Router } from 'express';
import * as util from 'util';
import * as mongodb from 'mongodb';
// import { MongoRepo } from '../../shared/MongoLib';
import { userService } from '../services/UserService';
import { teamService } from '../services/TeamService';
import { signupService } from '../services/SignupService';
import { TeamSchema } from '../domain/Team';
import { UserSchema } from '../domain/User';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { AccessKeyType, AuthTokenType } from '../../shared/Enums';
import { BaseLogger } from '../../shared/SGLogger';
import { accessKeyService } from '../services/AccessKeyService';
import { convertTeamAccessRightsToBitset } from '../utils/Shared';
import { google } from 'googleapis';
import axios from 'axios';
import { RedisLib } from '../../shared/RedisLib';
import * as _ from 'lodash';
import * as config from 'config';
import { ValidationError } from '../utils/Errors';
import { logger } from '@typegoose/typegoose/lib/logSettings';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

export default class LoginRouter {
    public router: Router;
    public redis: RedisLib;

    constructor() {
        this.router = Router();
        this.setRoutes();
        this.redis = new RedisLib();
    }

    setRoutes() {
        this.router.post('/weblogin', this.webLogin.bind(this));
        this.router.post('/apilogin', this.apiLogin.bind(this));
        this.router.post('/refreshtoken', this.refreshToken.bind(this));
        this.router.get('/goauth/init', this.goAuthInit.bind(this));
        this.router.get('/goauth_callback', this.goAuthCallback.bind(this));
        this.router.get('/ghauth/init', this.ghAuthInit.bind(this));
        this.router.get('/ghauth_callback', this.ghAuthCallback.bind(this));
        this.router.post('/goauth/complete', this.goAuthComplete.bind(this));
        // todo - an API login that will act a bit differently but still return a JWT
    }

    async goAuthInit(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;
        const sess: any = (<any>req).session;
        try {
            const goAuth2Client = new google.auth.OAuth2(
                process.env.googleAuthClientId,
                process.env.googleAuthClientSecret,
                process.env.googleAuthCallBackUrl
            );

            const goAuthUrl: any = goAuth2Client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',
                scope: [
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/userinfo.email',
                ],
            });

            // console.log('loginLink -> [', goAuthUrl, ']');

            // console.log('goAuthInit -> session -> ', sess);
            // console.log('goAuthInit -> session -> id -> ', sess.id);

            const authStateValue: any = req.headers.authstatevalue;
            sess.stateValue = authStateValue;

            // res.render('index', { loginLink: goAuthUrl});
            res.send(goAuthUrl);
            // res.redirect(goAuthUrl);
        } catch (err) {
            logger.LogError(err.message, {
                Error: err,
                Url: req.url,
                Headers: req.headers,
                Body: req.body,
                Params: req.params,
            });
            // console.log(err);
            res.status(401).send('Authentication failed');
        }
    }

    async goAuthComplete(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;
        const authStateValue: any = req.headers.authstatevalue;
        const authHashKey: any = req.headers.authhashkey;
        const sess: any = (<any>req).session;

        // console.log('goAuthComplete -> session -> ', sess);
        // console.log('goAuthComplete -> session -> id -> ', sess.id);

        // if (authStateValue !== sess.stateValue) {
        //   logger.LogError('Error in goAuthComplete', { Reason: "authStateValue !=== sess.stateValue", authStateValue, stateValue: sess.stateValue, authHashKey });
        //   res.status(401).send('Authentication failed');
        //   return;
        // }

        const userId: string = await this.redis.GetHashValue('oauth_cache', authHashKey);
        if (!userId) {
            logger.LogError('Error in goAuthComplete', {
                Reason: 'Missing authHashKey in redis oauth_cache hash',
                authHashKey,
            });
            res.status(401).send('Authentication failed');
            return;
        }

        await this.redis.DelHashValue('oauth_cache', authHashKey);

        const loginResult: any = await userService.findUser(
            new mongodb.ObjectId(userId),
            'id passwordHash email teamIds teamIdsInvited name companyName teamAccessRightIds'
        );

        if (!loginResult) {
            logger.LogError('Error in goAuthComplete', { Reason: 'User not found', userId });
            res.status(401).send('Authentication failed');
            return;
        }

        // Create a JWT
        const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // x minute(s)

        const secret = process.env.secret;
        var token = jwt.sign(
            {
                id: loginResult._id,
                type: AuthTokenType.USER,
                email: loginResult.email,
                teamIds: loginResult.teamIds,
                teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(loginResult),
                teamIdsInvited: loginResult.teamIdsInvited,
                name: loginResult.name,
                companyName: loginResult.companyName,
                exp: Math.floor(jwtExpiration / 1000),
            },
            secret
        ); //KeysUtil.getPrivate()); // todo - create a public / private key

        res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
        const relatedTeams = await teamService.findAllTeamsInternal({
            _id: { $in: loginResult.teamIds.map((id) => new mongodb.ObjectId(id)) },
        });

        const loginData = {
            // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
            config1: loginResult.email,
            config2: convertResponseData(TeamSchema, relatedTeams),
            config3: loginResult._id,
        };

        res.send(loginData);
    }

    async goAuthCallback(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;

        let baseUrl = config.get('WEB_CONSOLE_BASE_URL');
        const port = config.get('WEB_CONSOLE_PORT');
        if (port != '') baseUrl += `:${port}`;

        const sess: any = (<any>req).session;
        try {
            // console.log('goAuthCallback called');
            // console.log('session -> ', sess);
            const goAuth2Client = new google.auth.OAuth2(
                process.env.googleAuthClientId,
                process.env.googleAuthClientSecret,
                process.env.googleAuthCallBackUrl
            );

            // console.log('goAuthCallback -> req -> ', req.query)

            if (req.query.error) {
                res.redirect(`${baseUrl}/#/oauthCallbackError/${JSON.stringify(req.query.error)}`);
                return;
            } else {
                const { tokens } = await goAuth2Client.getToken((<any>req.query).code);

                const getUserResponse = await axios({
                    url: `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`,
                    method: 'GET',
                    headers: { Authorization: `Bearer ${tokens.id_token}` },
                });

                const googleUser: any = getUserResponse.data;

                if (!googleUser.verified_email) throw new ValidationError('Authentication failed');

                // console.log('googleUser -> ', googleUser);

                const loginResults: any = await userService.findAllUsersInternal(
                    { email: googleUser.email },
                    'id email teamIds teamIdsInvited name companyName teamAccessRightIds'
                );

                const hashKey =
                    Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15) +
                    Math.random().toString(36).substring(2, 15);

                let reRoutUrl;

                // User doesn't exist, create new user
                if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
                    const newUser: any = await signupService.signupNewUserOAuth(
                        { email: googleUser.email, name: googleUser.name, lastLogin: new Date().toISOString() },
                        logger
                    );
                    await this.redis.SetHashValue('oauth_cache', hashKey, newUser._id.toHexString());
                    reRoutUrl = `${baseUrl}/#/oauthCallback/signup/go/${hashKey}`;
                    // reRoutUrl = `${baseUrl}/#/oauthCallback/signup/go/123`;
                    // console.log('redirect route -> ', reRoutUrl);
                    res.redirect(reRoutUrl);
                    return;
                }

                const loginResult = loginResults[0];

                // console.log('loginResult -> ', loginResult);

                await this.redis.SetHashValue('oauth_cache', hashKey, loginResult._id.toHexString());
                reRoutUrl = `${baseUrl}/#/oauthCallback/login/go/${hashKey}`;
                // reRoutUrl = `${baseUrl}/#/oauthCallback/signup/go/123`;
                // console.log('redirect route -> ', reRoutUrl);
                res.redirect(reRoutUrl);
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
            res.redirect(`${baseUrl}/#/oauthCallbackError/${JSON.stringify(err.message)}`);
        }
    }

    async ghAuthInit(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;
        const sess: any = (<any>req).session;
        try {
            // const goAuth2Client = new google.auth.OAuth2(
            //   process.env.githubAuthClientId,
            //   process.env.githubAuthClientSecret,
            //   process.env.githubAuthCallBackUrl
            // );

            // const goAuthUrl: any = goAuth2Client.generateAuthUrl({
            //   access_type: 'offline',
            //   prompt: 'consent',
            //   scope: [
            //     'https://www.googleapis.com/auth/userinfo.profile',
            //     'https://www.googleapis.com/auth/userinfo.email',
            //   ]
            // });

            const authStateValue: any = req.headers.authstatevalue;
            sess.stateValue = authStateValue;

            const ghAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.get(
                'githubAuthClientId'
            )}&state=${authStateValue}&scope=user&redirect_uri=${process.env.githubAuthCallBackUrl}`;

            // console.log('loginLink -> [', ghAuthUrl, ']');

            // res.render('index', { loginLink: goAuthUrl});
            res.send(ghAuthUrl);
            // res.redirect(goAuthUrl);
        } catch (err) {
            logger.LogError(err.message, {
                Error: err,
                Url: req.url,
                Headers: req.headers,
                Body: req.body,
                Params: req.params,
            });
            // console.log(err);
            res.status(401).send('Authentication failed');
        }
    }

    async ghAuthCallback(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;
        const sess: any = (<any>req).session;
        try {
            // console.log('ghAuthCallback called');
            // console.log('session -> ', sess);
            // console.log('query -> ', req.query);

            const getTokenUrl = `https://github.com/login/oauth/access_token?client_id=${config.get(
                'githubAuthClientId'
            )}&client_secret=${process.env.githubAuthClientSecret}&code=${(<any>req.query).code}`;
            // console.log('getTokenurl -> ', getTokenUrl);

            const getTokenResponse = await axios({
                url: getTokenUrl,
                method: 'POST',
                headers: { Accept: 'application/json' },
            });

            const token = getTokenResponse.data.access_token;

            const getUserResponse = await axios({
                url: 'https://api.github.com/user',
                method: 'GET',
                headers: { Authorization: `token ${token}` },
            });

            const ghUser: any = getUserResponse.data;

            //   if (!googleUser.verified_email)
            //     throw new ValidationError('Authentication failed');

            // console.log('ghUser -> ', ghUser);

            const loginResults: any = await userService.findAllUsersInternal(
                { email: ghUser.email },
                'id email teamIds teamIdsInvited name companyName teamAccessRightIds'
            );

            const hashKey =
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);

            let baseUrl = config.get('WEB_CONSOLE_BASE_URL');
            const port = config.get('WEB_CONSOLE_PORT');
            if (port != '') baseUrl += `:${port}`;
            let reRoutUrl;

            // User doesn't exist, create new user
            if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
                const newUser: any = await signupService.signupNewUserOAuth(
                    { email: ghUser.email, name: ghUser.name, lastLogin: new Date().toISOString() },
                    logger
                );
                await this.redis.SetHashValue('oauth_cache', hashKey, newUser._id.toHexString());
                reRoutUrl = `${baseUrl}/#/oauthCallback/signup/go/${hashKey}`;
                // reRoutUrl = `${baseUrl}/#/oauthCallback/signup/go/123`;
                // console.log('redirect route -> ', reRoutUrl);
                res.redirect(reRoutUrl);
                return;
            }

            const loginResult = loginResults[0];

            // console.log('loginResult -> ', loginResult);

            await this.redis.SetHashValue('oauth_cache', hashKey, loginResult._id.toHexString());
            reRoutUrl = `${baseUrl}/#/oauthCallback/login/go/${hashKey}`;
            // reRoutUrl = `${baseUrl}/#/oauthCallback/signup/go/123`;
            // console.log('redirect route -> ', reRoutUrl);
            res.redirect(reRoutUrl);
        } catch (err) {
            logger.LogError(err.message, {
                Error: err,
                Url: req.url,
                Headers: req.headers,
                Body: req.body,
                Params: req.params,
            });
            console.log(err);
            res.redirect(`http://localhost:8080/#/oauthCallbackError/${JSON.stringify(err.message)}`);
        }
    }

    async webLogin(req: Request, res: Response, next: NextFunction) {
        console.log('\nBART, web logging in');
        const loginResults: any = await userService.findAllUsersInternal(
            { email: req.body.email },
            'id passwordHash email teamIds teamIdsInvited name companyName teamAccessRightIds'
        );

        if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
            res.status(401).send('Authentication failed');
            return;
        }

        const loginResult = loginResults[0];

        if (await bcrypt.compare(req.body.password, loginResult.passwordHash)) {
            // Create a JWT
            const jwtExpiration = Date.now() + 1000 * 60 * 60 * 24; // x minute(s)

            const secret = process.env.secret;
            var token = jwt.sign(
                {
                    id: loginResult._id,
                    type: AuthTokenType.USER,
                    email: loginResult.email,
                    teamIds: loginResult.teamIds,
                    teamAccessRightIds: UserSchema.convertTeamAccessRightsToBitset(loginResult),
                    teamIdsInvited: loginResult.teamIdsInvited,
                    name: loginResult.name,
                    companyName: loginResult.companyName,
                    exp: Math.floor(jwtExpiration / 1000),
                },
                secret
            ); //KeysUtil.getPrivate()); // todo - create a public / private key

            res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
            const relatedTeams = await teamService.findAllTeamsInternal({
                _id: { $in: loginResult.teamIds.map((id) => new mongodb.ObjectId(id)) },
            });

            const loginData = {
                // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
                config1: loginResult.email,
                config2: convertResponseData(TeamSchema, relatedTeams),
                config3: loginResult._id,
            };

            res.send(loginData);
        } else {
            res.status(401).send('Authentication failed');
        }
    }

    async apiLogin(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;
        try {
            const loginResults: any = await accessKeyService.findAllAccessKeysInternal(
                { accessKeyId: req.body.accessKeyId, accessKeySecret: req.body.accessKeySecret },
                '_teamId expiration revokeTime accessRightIds accessKeyType'
            );
            // console.log(`authenticating api access for client id ${req.body.accessKeyId}`);

            if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
                res.status(401).send('Authentication failed');
                return;
            }

            const loginResult = loginResults[0];

            if (
                loginResult.expiration < new Date() ||
                (loginResult.revokeTime && loginResult.revokeTime < new Date())
            ) {
                res.status(401).send('Authentication failed');
                return;
            }

            let teamAccessRightIds = {};
            teamAccessRightIds[loginResult._teamId] = convertTeamAccessRightsToBitset(loginResult.accessRightIds);

            const secret = process.env.secret;

            let tokenData: any = {
                id: loginResult._id,
                type: AuthTokenType.REFRESHKEY,
                accessKeyId: req.body.accessKeyId,
            };

            // Create a refresh JWT
            if (loginResult.accessKeyType == AccessKeyType.USER) {
                const refreshJwtExpiration = Date.now() + 1000 * 60 * 60 * 24 * 7; // 1 week
                tokenData['exp'] = Math.floor(refreshJwtExpiration / 1000);
            }

            var refreshToken = jwt.sign(tokenData, secret); //KeysUtil.getPrivate()); // todo - create a public / private key

            // Create an api JWT
            const jwtExpiration = Date.now() + 1000 * 60 * 10; // 10 minute(s)
            var token = jwt.sign(
                {
                    id: loginResult._id,
                    type: AuthTokenType.ACCESSKEY,
                    accessKeyId: req.body.accessKeyId,
                    expiration: loginResult.expiration,
                    teamIds: [loginResult._teamId],
                    teamAccessRightIds: teamAccessRightIds,
                    exp: Math.floor(jwtExpiration / 1000),
                },
                secret
            ); //KeysUtil.getPrivate()); // todo - create a public / private key

            const loginData = {
                // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
                config1: token,
                config2: refreshToken,
                config3: loginResult._teamId,
            };

            await accessKeyService.updateAccessKey(new mongodb.ObjectId(loginResult._teamId), loginResult._id, {
                lastUsed: new Date(),
            });

            // res.cookie('Auth', token, { secure: false, expires: new Date(jwtExpiration) });
            res.send(loginData);
        } catch (err) {
            logger.LogError(err.message, {
                Error: err,
                Url: req.url,
                Headers: req.headers,
                Body: req.body,
                Params: req.params,
            });
            // console.log(err);
            res.status(401).send('Authentication failed');
        }
    }

    async refreshToken(req: Request, res: Response, next: NextFunction) {
        const logger: BaseLogger = (<any>req).logger;
        const authToken = req.headers.auth ? req.headers.auth : req.cookies.Auth;
        let jwtData;
        try {
            const secret = process.env.secret;
            jwtData = jwt.verify(authToken, secret);

            if (jwtData.type != AuthTokenType.REFRESHKEY) {
                res.status(401).send('Authentication failed');
                return;
            }

            const loginResults: any = await accessKeyService.findAllAccessKeysInternal(
                { accessKeyId: jwtData.accessKeyId },
                '_teamId expiration revokeTime accessRightIds'
            );
            // console.log(`authenticating api access for client id ${req.body.accessKeyId}`);

            if (!loginResults || (_.isArray(loginResults) && loginResults.length < 1)) {
                res.status(401).send('Authentication failed');
                return;
            }

            const loginResult = loginResults[0];

            if (
                loginResult.expiration < new Date() ||
                (loginResult.revokeTime && loginResult.revokeTime < new Date())
            ) {
                res.status(401).send('Authentication failed');
                return;
            }

            let teamAccessRightIds = {};
            teamAccessRightIds[loginResult._teamId] = convertTeamAccessRightsToBitset(loginResult.accessRightIds);

            let tokenData: any = {
                id: loginResult._id,
                type: AuthTokenType.REFRESHKEY,
                accessKeyId: req.body.accessKeyId,
            };

            // Create a refresh JWT
            if (loginResults.accessKeyType == AccessKeyType.USER) {
                const refreshJwtExpiration = Date.now() + 1000 * 60 * 60 * 24 * 7; // 1 week
                tokenData['exp'] = Math.floor(refreshJwtExpiration / 1000);
            }

            var refreshToken = jwt.sign(tokenData, secret); //KeysUtil.getPrivate()); // todo - create a public / private key

            // Create an api JWT
            const jwtExpiration = Date.now() + 1000 * 60 * 10; // 10 minute(s)
            var token = jwt.sign(
                {
                    id: loginResult._id,
                    type: AuthTokenType.ACCESSKEY,
                    accessKeyId: req.body.accessKeyId,
                    expiration: loginResult.expiration,
                    teamIds: [loginResult._teamId],
                    teamAccessRightIds: teamAccessRightIds,
                    exp: Math.floor(jwtExpiration / 1000),
                },
                secret
            ); //KeysUtil.getPrivate()); // todo - create a public / private key

            const loginData = {
                // Use generic config names - slightly safer from lower skilled hackers  - probably doesn't matter
                config1: token,
                config2: refreshToken,
                config3: loginResult._teamId,
            };

            await accessKeyService.updateAccessKey(loginResult._teamId, new mongodb.ObjectId(loginResult._id), {
                lastUsed: new Date(),
            });

            res.send(loginData);
        } catch (err) {
            res.status(401).send('Authentication failed');
            return;
        }
    }
}
