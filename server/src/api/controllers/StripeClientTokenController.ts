import {Request, Response, NextFunction, response} from "express";
import {ResponseWrapper, ResponseCode} from "../utils/Types";
import {stripeClientTokenService} from "../services/StripeClientTokenService";
import {convertData as convertResponseData} from "../utils/ResponseConverters";
import * as _ from "lodash";
import * as mongodb from "mongodb";
import * as config from "config";

export class StripeClientTokenController {
  public async getStripePublicToken(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const response: ResponseWrapper = resp["body"];
    try {
      response.data = {key: config.get("stripePublicKey")};
      response.statusCode = ResponseCode.OK;
      return next();
    } catch (err) {
      return next(err);
    }
  }

  public async createStripeClientSecret(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      response.data = await stripeClientTokenService.createStripeClientSecret(_teamId);
      response.statusCode = ResponseCode.CREATED;
      return next();
    } catch (err) {
      return next(err);
    }
  }
}

export const stripeClientTokenController = new StripeClientTokenController();
