import {Request, Response, NextFunction} from "express";
import {ResponseWrapper, ResponseCode} from "../utils/Types";
import {jobActionService} from "../services/JobActionService";
import * as _ from "lodash";
import * as mongodb from "mongodb";
import {BaseLogger} from "../../shared/SGLogger";
import {AMQPConnector} from "../../shared/AMQPLib";

export class JobActionController {
  public async interruptJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const logger: BaseLogger = (<any>req).logger;
      const amqp: AMQPConnector = (<any>req).amqp;
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = resp["body"];
      const res = await jobActionService.interruptJob(_teamId, new mongodb.ObjectId(req.params.jobId), logger, amqp);
      response.data = res;
      response.statusCode = ResponseCode.OK;
      return next();
    } catch (err) {
      return next(err);
    }
  }

  public async restartJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const logger: BaseLogger = (<any>req).logger;
      const amqp: AMQPConnector = (<any>req).amqp;
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = resp["body"];
      const res = await jobActionService.restartJob(_teamId, new mongodb.ObjectId(req.params.jobId), logger, amqp);
      response.data = res;
      response.statusCode = ResponseCode.OK;
      return next();
    } catch (err) {
      return next(err);
    }
  }

  public async cancelJob(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const logger: BaseLogger = (<any>req).logger;
      const amqp: AMQPConnector = (<any>req).amqp;
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = resp["body"];
      const res = await jobActionService.cancelJob(_teamId, new mongodb.ObjectId(req.params.jobId), logger, amqp);
      response.data = res;
      response.statusCode = ResponseCode.OK;
      return next();
    } catch (err) {
      return next(err);
    }
  }
}

export const jobActionController = new JobActionController();
