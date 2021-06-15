import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { JobDefStatus } from '../../shared/Enums';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({schemaOptions: {collection: 'jobDef', minimize: false}})
export class JobDefSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({required: true})
  _teamId: mongodb.ObjectId;

  @prop({required: true}) 
  name: string;

  @prop({ default: JobDefStatus.RUNNING })
  status?: number;

  @prop({default: 0}) 
  lastRunId: number; 

  @prop({ default: 1 })
  maxInstances?: number;

  @prop({ required: false })
  misfireGraceTime?: number;

  @prop({ required: false })
  coalesce?: boolean;

  @prop({ required: true })
  createdBy: mongodb.ObjectId;

  @prop({default: new Date().toISOString()})
  dateCreated: Date;

  @prop()
  expectedValues?: any;

  @prop({ default: {} })
  runtimeVars?: any;

  @prop({ default: false })
  pauseOnFailedJob?: boolean;

  @prop()
  onJobTaskFailAlertEmail?: string;

  @prop()
  onJobCompleteAlertEmail?: string;

  @prop()
  onJobTaskInterruptedAlertEmail?: string;

  @prop()
  onJobTaskFailAlertSlackURL?: string;

  @prop()
  onJobCompleteAlertSlackURL?: string;

  @prop()
  onJobTaskInterruptedAlertSlackURL?: string;

  @prop({ default: false })
  launchingJobs?: boolean;

  @prop({ default: "# Job Description" })
  description?: string;

  @prop({ default: "IyBKb2IgZGVzY3JpcHRpb24=" })
  descriptionb64?: string;

  // https://hooks.slack.com/services/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

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'id': [FilterOperator.IN],
    'name': [FilterOperator.LIKE]
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
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api users won't see it
      // }
    }
  }
};

export const JobDefModel = getModelForClass(JobDefSchema);