import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { payInvoiceAutoService } from '../services/PayInvoiceAutoService';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class PayInvoiceAutoController {
    public async payInvoiceAuto(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const response: ResponseWrapper = resp['body'];
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const res = await payInvoiceAutoService.payInvoice(_teamId, req.body, logger, req.header('correlationId'));
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const payInvoiceAutoController = new PayInvoiceAutoController();