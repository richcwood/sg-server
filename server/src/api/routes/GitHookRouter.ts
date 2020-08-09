import {NextFunction, Request, Response, Router} from 'express';
import { MongoRepo } from '../../shared/MongoLib';
import { BaseLogger } from '../../shared/SGLogger';
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
const crypto = require('crypto')
const Octokit = require('@octokit/rest')
import * as util from 'util';
import * as config from 'config';

const mongoUrl = config.get('mongoUrl');
const mongoDbName = config.get('mongoDbName');
const redisHost = config.get('redisHost');
const redisPort = config.get('redisPort');
const redisPassword = config.get('redisPassword');
const env = config.get('environment');

// Your registered app must have a secret set. The secret is used to verify that webhooks are sent by GitHub.
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// The GitHub App's identifier (type integer) set when registering an app.
const APP_IDENTIFIER = process.env.GITHUB_APP_IDENTIFIER;

let appName: string = 'GitHookRouter';
let logger: BaseLogger = new BaseLogger(appName);
logger.Start();

export default class GitHookRouter {
  public router: Router;
  private mongoRepo: MongoRepo;

  constructor() {
    this.router = Router();
    this.mongoRepo = new MongoRepo(appName, mongoUrl, mongoDbName, logger);
    this.setRoutes();
  }

  setRoutes() {
    this.router.post('/', this.create.bind(this));
  }
  
  async create(req: Request, res: Response, next: NextFunction){
    const payload = JSON.stringify(req.body)
    if (!payload) {
      res.sendStatus(400);
      return;
    }
    
    const their_signature_header = req.headers['x-hub-signature'] || 'sha1=';
    let [ method, checksum ] = (<string>their_signature_header).split('=');

    const hmac = crypto.createHmac(method, WEBHOOK_SECRET, payload)
    const digest = hmac.update(payload).digest('hex')

    if (!checksum || !digest || checksum !== digest) {
      logger.LogError('Unauthorized', {Headers: util.inspect(req.headers, false, null), Body: util.inspect(req.body, false, null), Params: util.inspect(req.params, false, null)});
      res.status(403).send('Unauthorized');
      return;
    }

    if ( !req.body.ref) {
      res.sendStatus(400);
      return;
    }

    const pushTokens = req.body.ref.split('/');
    if (pushTokens.length < 3) {
      res.sendStatus(400);
      return;
    }
    
    if ( (pushTokens[0] !== 'refs') || (pushTokens[1] !== 'tags') ) {
      res.sendStatus(400);
      return;
    }
    
    const tag = pushTokens[2];

    console.log('tag -> ', tag);

    res.json({'status': 'message received'});
  }
}