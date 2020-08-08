import { modelOptions, prop, mapProp, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';
import { MongoDbSettings } from 'aws-sdk/clients/dms';


// Example of a schema / domain in Mongoose
@modelOptions({schemaOptions: {collection: 'stepDef'}})
export class StepDefSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({required: true}) 
  _orgId: mongodb.ObjectId;

  @prop({required: true}) 
  _taskDefId: mongodb.ObjectId;

  @prop({required: true}) 
  name: string;

  @prop({default: null})
  _scriptId: mongodb.ObjectId;

  @prop({required: true}) 
  order: number;

  @prop({default: ''}) 
  command?: string;

  @prop({default: ''}) 
  arguments: string;

  @mapProp({of: String, default: new Map([])})
  variables?: Map<string, string>;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE],
    '_taskDefId': [FilterOperator.EQUALS, FilterOperator.IN]
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
      _taskDefId: (data) => {
        return new mongodb.ObjectID(data._taskDefId);
      }
    },

    fromDB: {
      variables: (data) => {
        if(data.variables){
          // convert the map structure of typegoose into something that isn't stupid and can be serialized into json
          const obj = {};
          for(let [key, val] of data.variables){
            obj[key] = val;
          }       
          return obj;
        }
        else {
          return {};
        }
      }
    }
  }
};

export const StepDefModel = getModelForClass(StepDefSchema);
