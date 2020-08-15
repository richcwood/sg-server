import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'step' } })
export class StepSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: true })
  _teamId: mongodb.ObjectId;

  @prop({ required: true })
  _jobId: mongodb.ObjectId;

  @prop({ required: true })
  _taskId: mongodb.ObjectId;

  @prop({ required: true })
  name: string;

  @prop({ required: true })
  order: number;

  @prop({ required: true })
  script: any;

  @prop({ default: '' })
  command?: string;

  @prop({ default: '' })
  arguments: string;

  @prop({ default: {} })
  variables: any;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE, FilterOperator.EQUALS],
    '_taskId': [FilterOperator.IN, FilterOperator.EQUALS]
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
    // This isn't hooked up yet until needed - if it does, then call this in the controller layer on data before passing to service
    toDB: {
      _id: (data) => {
        return new mongodb.ObjectID(data._id);
      },
      _teamId: (data) => {
        return new mongodb.ObjectID(data._teamId);
      },
      _taskId: (data) => {
        return new mongodb.ObjectID(data._taskId);
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api users won't see it
      // }
    }
  }
};

export const StepModel = getModelForClass(StepSchema);