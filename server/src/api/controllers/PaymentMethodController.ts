import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { PaymentMethodSchema, PaymentMethodModel } from '../domain/PaymentMethod';
import { defaultBulkGet } from '../utils/BulkGet';
import { paymentMethodService } from '../services/PaymentMethodService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';

let errorHandler = (err, req: Request, resp: Response, next: NextFunction) => {
    // If req.params.paymentMethodId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
    if (err instanceof Error.CastError) {
        if (req.params && req.params.paymentMethodId)
            return next(new MissingObjectError(`PaymentMethod ${req.params.paymentMethodId} not found.`));
        else return next(new MissingObjectError(`PaymentMethod not found.`));
    } else {
        return next(err);
    }
};

export class PaymentMethodController {
    public async getManyPaymentMethods(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, PaymentMethodSchema, PaymentMethodModel, paymentMethodService);
    }

    public async getPaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const paymentMethod = await paymentMethodService.findPaymentMethod(
                _teamId,
                new mongodb.ObjectId(req.params.paymentMethodId),
                <string>req.query.responseFields
            );

            if (_.isArray(paymentMethod) && paymentMethod.length === 0) {
                return next(new MissingObjectError(`PaymentMethod ${req.params.paymentMethodId} not found.`));
            } else {
                response.data = convertResponseData(PaymentMethodSchema, paymentMethod[0]);
                return next();
            }
        } catch (err) {
            return errorHandler(err, req, resp, next);
        }
    }

    public async createPaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newPaymentMethod = await paymentMethodService.createPaymentMethod(
                _teamId,
                convertRequestData(PaymentMethodSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            response.data = convertResponseData(PaymentMethodSchema, newPaymentMethod);
            response.statusCode = ResponseCode.CREATED;
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updatePaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedPaymentMethod: any = await paymentMethodService.updatePaymentMethod(
                _teamId,
                new mongodb.ObjectId(req.params.paymentMethodId),
                convertRequestData(PaymentMethodSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedPaymentMethod) && updatedPaymentMethod.length === 0) {
                return next(new MissingObjectError(`PaymentMethod ${req.params.paymentMethodId} not found.`));
            } else {
                response.data = convertResponseData(PaymentMethodSchema, updatedPaymentMethod);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deletePaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await paymentMethodService.deletePaymentMethod(
                _teamId,
                new mongodb.ObjectId(req.params.paymentMethodId),
                req.header('correlationId')
            );
            response.statusCode = ResponseCode.OK;
            return next();
        } catch (err) {
            return next(err);
        }
    }
}

export const paymentMethodController = new PaymentMethodController();
