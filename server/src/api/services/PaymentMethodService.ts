import { convertData } from '../utils/ResponseConverters';
import { PaymentMethodSchema, PaymentMethodModel } from '../domain/PaymentMethod';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { teamService } from '../services/TeamService';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';

export class PaymentMethodService {
    public async findAllPaymentMethodsInternal(filter?: any, responseFields?: string) {
        return PaymentMethodModel.find(filter).select(responseFields);
    }

    public async findAllPaymentMethods(_teamId: mongodb.ObjectId, responseFields?: string) {
        return PaymentMethodModel.find({ _teamId }).select(responseFields);
    }

    public async findPaymentMethod(
        _teamId: mongodb.ObjectId,
        paymentMethodId: mongodb.ObjectId,
        responseFields?: string
    ) {
        return PaymentMethodModel.findById(paymentMethodId).find({ _teamId }).select(responseFields);
    }

    public async createPaymentMethodInternal(data: any): Promise<object> {
        const model = new PaymentMethodModel(data);
        await model.save();
        return;
    }

    public async createPaymentMethod(
        _teamId: mongodb.ObjectId,
        data: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<object> {
        data._teamId = _teamId;
        const paymentMethodModel = new PaymentMethodModel(data);
        const newPaymentMethod = await paymentMethodModel.save();

        await rabbitMQPublisher.publish(
            _teamId,
            'PaymentMethod',
            correlationId,
            PayloadOperation.CREATE,
            convertData(PaymentMethodSchema, newPaymentMethod)
        );

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findPaymentMethod(_teamId, newPaymentMethod.id, responseFields);
        } else {
            return newPaymentMethod; // fully populated model
        }
    }

    public async updatePaymentMethod(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        data: any,
        correlationId?: string,
        responseFields?: string
    ): Promise<object> {
        const filter = { _id: id, _teamId };
        const updatedPaymentMethod = await PaymentMethodModel.findOneAndUpdate(filter, data, { new: true }).select(
            responseFields
        );

        if (!updatedPaymentMethod)
            throw new MissingObjectError(
                `PaymentMethod '${id}" not found with filter "${JSON.stringify(filter, null, 4)}'.`
            );

        const deltas = Object.assign({ _id: id }, data);
        await rabbitMQPublisher.publish(
            _teamId,
            'PaymentMethod',
            correlationId,
            PayloadOperation.UPDATE,
            convertData(PaymentMethodSchema, deltas)
        );

        return updatedPaymentMethod; // fully populated model
    }

    public async deletePaymentMethod(
        _teamId: mongodb.ObjectId,
        id: mongodb.ObjectId,
        correlationId?: string
    ): Promise<object> {
        const deleted = await PaymentMethodModel.deleteOne({ _id: id, _teamId });

        const teamModel: any = await teamService.findTeam(new mongodb.ObjectId(_teamId), '_id defaultPaymentMethodId');
        if (!teamModel) throw new MissingObjectError(`No team found with id "${_teamId.toHexString()}"`);

        if (teamModel._id.toHexString() == id.toHexString()) {
            const paymentMethods = await this.findAllPaymentMethodsInternal({ _teamId }, '_id');
            if (_.isArray(paymentMethods) && paymentMethods.length > 0) {
                teamModel.defaultPaymentMethodId = paymentMethods[0]._id;
                await teamModel.save();
            } else {
                teamModel.defaultPaymentMethodId = null;
                await teamModel.save();
            }
            await rabbitMQPublisher.publish(_teamId, 'Team', correlationId, PayloadOperation.UPDATE, {
                _id: id,
                defaultPaymentMethodId: teamModel.defaultPaymentMethodId,
            });
        }

        await rabbitMQPublisher.publish(_teamId, 'PaymentMethod', correlationId, PayloadOperation.DELETE, { _id: id });

        return deleted;
    }
}

export const paymentMethodService = new PaymentMethodService();
