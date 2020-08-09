import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { payInvoiceManualService } from '../services/PayInvoiceManualService';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class PayInvoiceManualController {
    public async payInvoiceManual(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const response: ResponseWrapper = resp['body'];
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const res = await payInvoiceManualService.payInvoice(_orgId, req.body, logger, req.header('correlationId'));
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const payInvoiceManualController = new PayInvoiceManualController();