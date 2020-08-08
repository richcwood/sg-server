import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { PaymentMethodSchema, PaymentMethodModel } from '../domain/PaymentMethod';
import { defaultBulkGet } from '../utils/BulkGet';
import { paymentMethodService } from '../services/PaymentMethodService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class PaymentMethodController {

    public async getManyPaymentMethods(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        defaultBulkGet({ _orgId }, req, resp, next, PaymentMethodSchema, PaymentMethodModel, paymentMethodService);
    }


    public async getPaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
            const response: ResponseWrapper = (resp as any).body;
            const paymentMethod = await paymentMethodService.findPaymentMethod(_orgId, new mongodb.ObjectId(req.params.paymentMethodId), req.query.responseFields);

            if (_.isArray(paymentMethod) && paymentMethod.length === 0) {
                next(new MissingObjectError(`PaymentMethod ${req.params.paymentMethodId} not found.`));
            }
            else {
                response.data = convertResponseData(PaymentMethodSchema, paymentMethod[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.paymentMethodId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`PaymentMethod ${req.params.paymentMethodId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createPaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newPaymentMethod = await paymentMethodService.createPaymentMethod(_orgId, convertRequestData(PaymentMethodSchema, req.body), req.header('correlationId'), req.query.responseFields);
            response.data = convertResponseData(PaymentMethodSchema, newPaymentMethod);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updatePaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedPaymentMethod: any = await paymentMethodService.updatePaymentMethod(_orgId, new mongodb.ObjectId(req.params.paymentMethodId), convertRequestData(PaymentMethodSchema, req.body), req.header('correlationId'), req.query.responseFields);

            if (_.isArray(updatedPaymentMethod) && updatedPaymentMethod.length === 0) {
                next(new MissingObjectError(`PaymentMethod ${req.params.paymentMethodId} not found.`));
            }
            else {
                response.data = convertResponseData(PaymentMethodSchema, updatedPaymentMethod);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }


    public async deletePaymentMethod(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _orgId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._orgid);
        const response: ResponseWrapper = resp['body'];
        try {
            response.data = await paymentMethodService.deletePaymentMethod(_orgId, new mongodb.ObjectId(req.params.paymentMethodId), req.header('correlationId'));
            response.statusCode = ResponseCode.OK;
            next();
        }
        catch (err) {
            next(err);
        }
    }
}

export const paymentMethodController = new PaymentMethodController();