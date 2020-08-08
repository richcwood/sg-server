import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { braintreeClientTokenService } from '../services/BraintreeClientTokenService';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class BraintreeClientTokenController {

    public async createBraintreeClientToken(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await braintreeClientTokenService.createBraintreeClientToken(_orgId);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const braintreeClientTokenController = new BraintreeClientTokenController();