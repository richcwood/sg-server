import { Request, Response, NextFunction } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { forgotPasswordService } from '../services/ForgotPasswordService';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';

export class ForgotPasswordController {
    public async requestReset(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const response: ResponseWrapper = resp['body'];
        const logger: BaseLogger = (<any>req).logger;
        try {
            const res = await forgotPasswordService.requestReset(req.body, logger);
            response.data = res;
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const forgotPasswordController = new ForgotPasswordController();
