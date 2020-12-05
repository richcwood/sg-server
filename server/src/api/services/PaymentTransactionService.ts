import { convertData } from '../utils/ResponseConverters';
import { PaymentTransactionSchema, PaymentTransactionModel } from '../domain/PaymentTransaction';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class PaymentTransactionService {

    public async findAllPaymentTransactionsInternal(filter?: any, responseFields?: string) {
        return PaymentTransactionModel.find(filter).select(responseFields);
    }


    public async findAllPaymentTransactions(_teamId: mongodb.ObjectId, responseFields?: string) {
        return PaymentTransactionModel.find({ _teamId }).select(responseFields);
    }


    public async findPaymentTransaction(_teamId: mongodb.ObjectId, paymentTransactionId: mongodb.ObjectId, responseFields?: string) {
        return PaymentTransactionModel.findById(paymentTransactionId).find({ _teamId }).select(responseFields);
    }


    public async createPaymentTransactionInternal(data: any): Promise<object> {
        const model = new PaymentTransactionModel(data);
        await model.save();
        return;
    }


    public async createPaymentTransaction(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        data._teamId = _teamId;
        const paymentTransactionModel = new PaymentTransactionModel(data);
        const newPaymentTransaction = await paymentTransactionModel.save();

        await rabbitMQPublisher.publish(_teamId, "PaymentTransaction", correlationId, PayloadOperation.CREATE, convertData(PaymentTransactionSchema, newPaymentTransaction));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findPaymentTransaction(_teamId, newPaymentTransaction.id, responseFields);
        }
        else {
            return newPaymentTransaction; // fully populated model
        }
    }


    public async updatePaymentTransaction(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        if ('_invoiceId' in data)
            throw new ValidationError('Unable to update _invoiceId field');
        if ('source' in data)
            throw new ValidationError('Unable to update source field');
        if ('transactionId' in data)
            throw new ValidationError('Unable to update transactionId field');
        if ('amount' in data)
            throw new ValidationError('Unable to update amount field');

        const filter = { _id: id, _teamId };
        const updatedPaymentTransaction = await PaymentTransactionModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedPaymentTransaction)
            throw new MissingObjectError(`PaymentTransaction '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_teamId, "PaymentTransaction", correlationId, PayloadOperation.UPDATE, convertData(PaymentTransactionSchema, deltas));

        return updatedPaymentTransaction; // fully populated model
    }
}

export const paymentTransactionService = new PaymentTransactionService();