import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { createInvoiceService } from '../services/CreateInvoiceService';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';

export class CreateInvoiceController {
    public async createInvoice(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const logger: BaseLogger = (<any>req).logger;
        const response: ResponseWrapper = resp['body'];
        try {
            const res = await createInvoiceService.createInvoice(
                req.body,
                logger,
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const createInvoiceController = new CreateInvoiceController();
