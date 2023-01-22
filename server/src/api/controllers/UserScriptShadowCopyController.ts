import {Request, Response, NextFunction, response} from "express";
import {ResponseWrapper, ResponseCode} from "../utils/Types";
import {UserScriptShadowCopySchema, UserScriptShadowCopyModel} from "../domain/UserScriptShadowCopy";
import {defaultBulkGet} from "../utils/BulkGet";
import {userScriptShadowCopyService} from "../services/UserScriptShadowCopyService";
import {MissingObjectError} from "../utils/Errors";
import {Error} from "mongoose";
import {convertData as convertResponseData} from "../utils/ResponseConverters";
import {convertData as convertRequestData} from "../utils/RequestConverters";
import * as _ from "lodash";
import * as mongodb from "mongodb";

export class UserScriptShadowCopyController {
  public async getManyUserScriptShadowCopys(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    defaultBulkGet(
      {_teamId},
      req,
      resp,
      next,
      UserScriptShadowCopySchema,
      UserScriptShadowCopyModel,
      userScriptShadowCopyService
    );
  }

  public async getUserScriptShadowCopy(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
      const response: ResponseWrapper = (resp as any).body;
      const userScriptShadowCopy = await userScriptShadowCopyService.findUserScriptShadowCopy(
        _teamId,
        new mongodb.ObjectId(req.params.userScriptShadowCopyId),
        <string>req.query.responseFields
      );

      if (_.isArray(userScriptShadowCopy) && userScriptShadowCopy.length === 0) {
        return next(new MissingObjectError(`UserScriptShadowCopy ${req.params.userScriptShadowCopyId} not found.`));
      } else {
        response.data = convertResponseData(UserScriptShadowCopySchema, userScriptShadowCopy[0]);
        return next();
      }
    } catch (err) {
      // If req.params.userScriptShadowCopyId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
      if (err instanceof Error.CastError) {
        return next(new MissingObjectError(`UserScriptShadowCopy ${req.params.userScriptShadowCopyId} not found.`));
      } else {
        return next(err);
      }
    }
  }

  public async createUserScriptShadowCopy(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const newUserScriptShadowCopy = await userScriptShadowCopyService.createUserScriptShadowCopy(
        _teamId,
        convertRequestData(UserScriptShadowCopySchema, req.body),
        req.header("correlationId"),
        <string>req.query.responseFields
      );
      response.data = convertResponseData(UserScriptShadowCopySchema, newUserScriptShadowCopy);
      response.statusCode = ResponseCode.CREATED;
      return next();
    } catch (err) {
      return next(err);
    }
  }

  public async updateUserScriptShadowCopy(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      const updatedUserScriptShadowCopy: any = await userScriptShadowCopyService.updateUserScriptShadowCopy(
        _teamId,
        new mongodb.ObjectId(req.params.userScriptShadowCopyId),
        convertRequestData(UserScriptShadowCopySchema, req.body),
        req.header("correlationId"),
        <string>req.query.responseFields
      );

      if (_.isArray(updatedUserScriptShadowCopy) && updatedUserScriptShadowCopy.length === 0) {
        return next(new MissingObjectError(`UserScriptShadowCopy ${req.params.userScriptShadowCopyId} not found.`));
      } else {
        response.data = convertResponseData(UserScriptShadowCopySchema, updatedUserScriptShadowCopy);
        response.statusCode = ResponseCode.OK;
        return next();
      }
    } catch (err) {
      return next(err);
    }
  }

  public async deleteUserScriptShadowCopy(req: Request, resp: Response, next: NextFunction): Promise<void> {
    const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
    const response: ResponseWrapper = resp["body"];
    try {
      response.data = await userScriptShadowCopyService.deleteUserScriptShadowCopy(
        _teamId,
        new mongodb.ObjectId(req.params.userScriptShadowCopyId),
        req.header("correlationId")
      );
      response.statusCode = ResponseCode.OK;
      return next();
    } catch (err) {
      return next(err);
    }
  }
}

export const userScriptShadowCopyController = new UserScriptShadowCopyController();
