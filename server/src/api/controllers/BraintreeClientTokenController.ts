import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { braintreeClientTokenService } from '../services/BraintreeClientTokenService';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

export class BraintreeClientTokenController {
    public async createBraintreeClientToken(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await braintreeClientTokenService.createBraintreeClientToken(_teamId);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const braintreeClientTokenController = new BraintreeClientTokenController();
