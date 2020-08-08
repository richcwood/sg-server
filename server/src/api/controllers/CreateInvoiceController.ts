import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { createInvoiceService } from '../services/CreateInvoiceService';
import { BaseLogger } from '../../shared/KikiLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { MongoRepo } from '../../shared/MongoLib';


export class CreateInvoiceController {
    public async createInvoice(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const mongoLib: MongoRepo = (<any>req).mongoLib;
        const response: ResponseWrapper = resp['body'];
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const res = await createInvoiceService.createInvoice(_orgId, req.body, mongoLib, logger, req.header('correlationId'), req.query.responseFields);
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const createInvoiceController = new CreateInvoiceController();