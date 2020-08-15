import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { PaymentTransactionSchema, PaymentTransactionModel } from '../domain/PaymentTransaction';
import { defaultBulkGet } from '../utils/BulkGet';
import { paymentTransactionService } from '../services/PaymentTransactionService';
import { MissingObjectError } from '../utils/Errors';
import { CastError } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import { BaseLogger } from '../../shared/SGLogger';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';


export class PaymentTransactionController {

    public async getManyPaymentTransactions(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, PaymentTransactionSchema, PaymentTransactionModel, paymentTransactionService);
    }


    public async getPaymentTransaction(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const paymentTransaction = await paymentTransactionService.findPaymentTransaction(_teamId, new mongodb.ObjectId(req.params.paymentTransactionId), (<string>req.query.responseFields));

            if (_.isArray(paymentTransaction) && paymentTransaction.length === 0) {
                next(new MissingObjectError(`PaymentTransaction ${req.params.paymentTransactionId} not found.`));
            }
            else {
                response.data = convertResponseData(PaymentTransactionSchema, paymentTransaction[0]);
                next();
            }
        }
        catch (err) {
            // If req.params.paymentTransactionId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof CastError) {
                next(new MissingObjectError(`PaymentTransaction ${req.params.paymentTransactionId} not found.`));
            }
            else {
                next(err);
            }
        }
    }


    public async createPaymentTransaction(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newPaymentTransaction = await paymentTransactionService.createPaymentTransaction(_teamId, convertRequestData(PaymentTransactionSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));
            response.data = convertResponseData(PaymentTransactionSchema, newPaymentTransaction);
            response.statusCode = ResponseCode.CREATED;
            next();
        }
        catch (err) {
            next(err);
        }
    }


    public async updatePaymentTransaction(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedPaymentTransaction: any = await paymentTransactionService.updatePaymentTransaction(_teamId, new mongodb.ObjectId(req.params.paymentTransactionId), convertRequestData(PaymentTransactionSchema, req.body), req.header('correlationId'), (<string>req.query.responseFields));

            if (_.isArray(updatedPaymentTransaction) && updatedPaymentTransaction.length === 0) {
                next(new MissingObjectError(`PaymentTransaction ${req.params.paymentTransactionId} not found.`));
            }
            else {
                response.data = convertResponseData(PaymentTransactionSchema, updatedPaymentTransaction);
                response.statusCode = ResponseCode.OK;
                next();
            }
        }
        catch (err) {
            next(err);
        }
    }
}

export const paymentTransactionController = new PaymentTransactionController();