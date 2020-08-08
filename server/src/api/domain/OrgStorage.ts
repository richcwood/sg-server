import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'orgStorage' } })
export class OrgStorageSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: true })
  _orgId: mongodb.ObjectId;

  @prop({ required: true })
  date: Date;

  @prop({ default: 1 })
  numobservations: number;

  @prop({ required: true })
  bytes: number;


  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    // 'name': [FilterOperator.LIKE]
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
        return new mongodb.ObjectID(data._id);
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api orgStorages won't see it
      // }
    }
  }
};

export const OrgStorageModel = getModelForClass(OrgStorageSchema);