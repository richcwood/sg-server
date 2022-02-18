import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { PaymentMethodType } from '../../shared/Enums';
import { AccessRight } from '../../shared/Enums';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'paymentMethod' } })
export class PaymentMethodSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: true })
  _teamId: mongodb.ObjectId;

  @prop({ required: true })
  name: string;

  @prop({ required: true })
  type: PaymentMethodType;

  @prop({ required: true })
  stripePaymentMethodId: string;

  @prop({required: false})
  cardBrand?: string;

  @prop({ required: true })
  last4: string;


  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE]
    // 'dog.name': [FilterOperator.IN, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.LIKE
    // ],
    // 'dog.smell': [FilterOperator.LIKE],
    // firstName: [FilterOperator.IN, FilterOperator.LIKE, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
    // lastName: [FilterOperator.IN, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
    // id: [FilterOperator.EQUALS, FilterOperator.IN]
  };

  // 2 way map between field values the API client sees and what is stored in the database.  Allows client to use 'id' and database to use '_id'
  public static readonly propAliases = {
    '_id': 'id',
    'id': '_id',
    '__v': 'version'
  };

  // Converters for values to/from the database.  Converter functions take the entire model
  public static readonly dataConverters = {
    toDB: {
      _id: (data) => {
        return new mongodb.ObjectId(data._id);
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api paymentMethods won't see it
      // }
    }
  }
};

export const PaymentMethodModel = getModelForClass(PaymentMethodSchema);