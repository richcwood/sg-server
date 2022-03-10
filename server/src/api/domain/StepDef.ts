import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';
import { MongoDbSettings } from 'aws-sdk/clients/dms';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'stepDef' }, options: { allowMixed: Severity.ALLOW } })
export class StepDefSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({required: true}) 
  _teamId: mongodb.ObjectId;

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

  @prop({ type: String, default: new Map([])})
  variables?: Map<string, string>;

  @prop({ default: 'script' })
  lambdaCodeSource?: string;

  @prop({ default: '' })
  lambdaRuntime?: string;

  @prop({ default: 128 }) 
  lambdaMemorySize?: number;

  @prop({ default: 3 }) 
  lambdaTimeout?: number;

  @prop({ default: '' })
  lambdaZipfile?: string;

  @prop({ default: '' })
  lambdaFunctionHandler?: string;

  @prop({ default: '' })
  lambdaAWSRegion?: string;

  @prop({ default: '' })
  lambdaDependencies?: string;


  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE, FilterOperator.EQUALS],
    '_taskDefId': [FilterOperator.EQUALS, FilterOperator.IN],
    '_scriptId': [FilterOperator.EQUALS]
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
        return new mongodb.ObjectId(data._id);
      },
      _teamId: (data) => {
        return new mongodb.ObjectId(data._teamId);
      },
      _taskDefId: (data) => {
        return new mongodb.ObjectId(data._taskDefId);
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
