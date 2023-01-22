import {Request, Response, NextFunction, response} from "express";
import {ResponseWrapper, ResponseCode} from "../utils/Types";
import {AccessRightSchema, AccessRightModel} from "../domain/AccessRight";
import {accessRightService} from "../services/AccessRightService";
import {MissingObjectError} from "../utils/Errors";
import {convertData as convertResponseData} from "../utils/ResponseConverters";

import * as _ from "lodash";

export class AccessRightController {
  public async getManyAccessRights(req: Request, resp: Response, next: NextFunction): Promise<void> {
    try {
      const response: ResponseWrapper = (resp as any).body;
      const accessRights = await accessRightService.findAllAccessRights(<string>req.query.responseFields);

      response.data = convertResponseData(AccessRightSchema, accessRights);
      return next();
    } catch (err) {
      return next(err);
    }
  }
}

export const accessRightController = new AccessRightController();
