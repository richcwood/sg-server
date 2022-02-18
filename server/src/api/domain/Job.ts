import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';
import { MongoDbSettings } from 'aws-sdk/clients/dms';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'job', minimize: false } })
export class JobSchema {

    _id?: mongodb.ObjectId;
    
    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: false })
    _jobDefId?: mongodb.ObjectId;

    @prop({ required: false })
    runId?: number;

    @prop({ required: true })
    name: string;

    @prop({ required: true })
    createdBy: string;

    @prop({ default: new Date().toISOString() })
    dateCreated?: Date;

    @prop()
    dateScheduled?: Date;

    @prop()
    dateStarted?: Date;

    @prop()
    dateCompleted?: Date;

    @prop()
    status?: number;

    @prop()
    error?: string;

    @prop({ default: {} })
    runtimeVars: any;

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
  
    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        'name': [FilterOperator.LIKE],
        'dateCreated': [FilterOperator.LESS_THAN,FilterOperator.LESS_THAN_EQUAL_TO,FilterOperator.GREATER_THAN,FilterOperator.GREATER_THAN_EQUAL_TO],
        'dateCompleted': [FilterOperator.LESS_THAN,FilterOperator.LESS_THAN_EQUAL_TO,FilterOperator.GREATER_THAN,FilterOperator.GREATER_THAN_EQUAL_TO],
        'dateStarted': [FilterOperator.LESS_THAN,FilterOperator.LESS_THAN_EQUAL_TO,FilterOperator.GREATER_THAN,FilterOperator.GREATER_THAN_EQUAL_TO],
        '_jobDefId': [FilterOperator.EQUALS],
        'status': [FilterOperator.EQUALS]
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
                return new mongodb.ObjectId(data._id);
            },
            _teamId: (data) => {
                return new mongodb.ObjectId(data._teamId);
            },
            _jobDefId: (data) => {
                return new mongodb.ObjectId(data._jobDefId);
            }
        },

        fromDB: {
            // version: (data) => {
            //   return undefined; // remove the version field - api users won't see it
            // }
        }
    }
};

export const JobModel = getModelForClass(JobSchema);