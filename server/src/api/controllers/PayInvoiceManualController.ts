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
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const res = await payInvoiceManualService.payInvoice(
                _teamId,
                req.body,
                logger,
                req.header('correlationId')
            );
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const payInvoiceManualController = new PayInvoiceManualController();
