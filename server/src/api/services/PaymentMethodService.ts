import { convertData } from '../utils/ResponseConverters';
import { PaymentMethodSchema, PaymentMethodModel } from '../domain/PaymentMethod';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';


export class PaymentMethodService {

    public async findAllPaymentMethodsInternal(filter?: any, responseFields?: string) {
        return PaymentMethodModel.find(filter).select(responseFields);
    }


    public async findAllPaymentMethods(_orgId: mongodb.ObjectId, responseFields?: string) {
        return PaymentMethodModel.find({ _orgId }).select(responseFields);
    }


    public async findPaymentMethod(_orgId: mongodb.ObjectId, paymentMethodId: mongodb.ObjectId, responseFields?: string) {
        return PaymentMethodModel.findById(paymentMethodId).find({ _orgId }).select(responseFields);
    }


    public async createPaymentMethodInternal(data: any): Promise<object> {
        const model = new PaymentMethodModel(data);
        await model.save();
        return;
    }


    public async createPaymentMethod(_orgId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        data._orgId = _orgId;
        const paymentMethodModel = new PaymentMethodModel(data);
        const newPaymentMethod = await paymentMethodModel.save();

        await rabbitMQPublisher.publish(_orgId, "PaymentMethod", correlationId, PayloadOperation.CREATE, convertData(PaymentMethodSchema, newPaymentMethod));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findPaymentMethod(_orgId, newPaymentMethod.id, responseFields);
        }
        else {
            return newPaymentMethod; // fully populated model
        }
    }


    public async updatePaymentMethod(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        const filter = { _id: id, _orgId };
        const updatedPaymentMethod = await PaymentMethodModel.findOneAndUpdate(filter, data, { new: true }).select(responseFields);

        if (!updatedPaymentMethod)
            throw new MissingObjectError(`PaymentMethod '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`)

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(_orgId, "PaymentMethod", correlationId, PayloadOperation.UPDATE, convertData(PaymentMethodSchema, deltas));

        return updatedPaymentMethod; // fully populated model
    }


    public async deletePaymentMethod(_orgId: mongodb.ObjectId, id: mongodb.ObjectId, correlationId: string): Promise<object> {
        const deleted = await PaymentMethodModel.deleteOne({ _id: id, _orgId });

        await rabbitMQPublisher.publish(_orgId, "PaymentMethod", correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }
}

export const paymentMethodService = new PaymentMethodService();