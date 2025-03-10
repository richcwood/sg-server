import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { PaymentTransactionSource } from '../../shared/Enums';
import { PaymentTransactionStatus } from '../../shared/Enums';
import { AccessRight } from '../../shared/Enums';
import * as mongodb from 'mongodb';

// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'paymentTransaction' }, options: { allowMixed: Severity.ALLOW } })
export class PaymentTransactionSchema {
    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: true })
    _invoiceId: mongodb.ObjectId;

    @prop({ required: true })
    source: PaymentTransactionSource;

    @prop({ required: true })
    processorTransactionId: string;

    @prop({ required: true })
    createdAt: Date;

    @prop({ required: true })
    charges: any[];

    @prop({ required: true })
    refunds: any[];

    @prop({ required: true })
    status: string;

    @prop({ required: true })
    amount: number;

    @prop({ default: 0 })
    amount_captured: number;

    @prop({ default: 0 })
    amount_refunded: number;

    @prop()
    refunded?: boolean;

    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        name: [FilterOperator.LIKE],
        // 'dog.name': [FilterOperator.IN, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.LIKE
        // ],
        // 'dog.smell': [FilterOperator.LIKE],
        // firstName: [FilterOperator.IN, FilterOperator.LIKE, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
        // lastName: [FilterOperator.IN, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
        // id: [FilterOperator.EQUALS, FilterOperator.IN]
    };

    // 2 way map between field values the API client sees and what is stored in the database.  Allows client to use 'id' and database to use '_id'
    public static readonly propAliases = {
        _id: 'id',
        id: '_id',
        __v: 'version',
    };

    // Converters for values to/from the database.  Converter functions take the entire model
    public static readonly dataConverters = {
        toDB: {
            _id: (data) => {
                return new mongodb.ObjectId(data._id);
            },
        },

        fromDB: {
            // version: (data) => {
            //   return undefined; // remove the version field - api paymentTransactions won't see it
            // }
        },
    };
}

export const PaymentTransactionModel = getModelForClass(PaymentTransactionSchema);
