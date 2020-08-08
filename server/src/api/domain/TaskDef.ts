import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { TaskDefTarget } from '../../shared/Enums';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({schemaOptions: {collection: 'taskDef', minimize: false}})
export class TaskDefSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({required: true}) 
  _orgId: mongodb.ObjectId;

  @prop({required: true}) 
  _jobDefId: mongodb.ObjectId;

  @prop({required: true})
  target: TaskDefTarget;

  @prop({required: true}) 
  name: string;

  @prop({required: false}) 
  order?: number;

  @prop({required: false}) 
  targetAgentId?: string; 

  @prop({default: {}}) 
  requiredTags: any;

  @prop({default: []})
  fromRoutes: string[][];

  @prop({default: []})
  toRoutes?: string[][];

  @prop({default: []})
  artifacts?: any[];

  @prop()
  expectedValues?: any;

  @prop({ default: false })
  autoRestart?: boolean;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.EQUALS, FilterOperator.LIKE],
    '_jobDefId': [FilterOperator.EQUALS, FilterOperator.IN],
    'target': [FilterOperator.EQUALS, FilterOperator.IN]
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
      _orgId: (data) => {
        return new mongodb.ObjectID(data._orgId);
      },
      _jobDefId: (data) => {
        return new mongodb.ObjectID(data._jobDefId);
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api users won't see it
      // }
    }
  }
};

export const TaskDefModel = getModelForClass(TaskDefSchema);