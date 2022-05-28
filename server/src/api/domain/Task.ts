import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { TaskDefTarget, TaskSource } from '../../shared/Enums';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'task', minimize: false }, options: { allowMixed: Severity.ALLOW }  })
export class TaskSchema {

    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: true })
    _jobId: mongodb.ObjectId;

    @prop({ required: false })
    sourceTaskRoute?: any;

    @prop({ required: true })
    name: string;

    @prop({ required: true })
    source: TaskSource;

    @prop({required: true})
    target: TaskDefTarget;

    @prop({required: false}) 
    targetAgentId?: string; 
  
    @prop({default: {}}) 
    requiredTags: any;
  
    @prop({ default: [] })
    fromRoutes?: string[][];

    @prop({default: []})
    toRoutes?: string[][];
  
    @prop({ default: [] })
    artifacts?: mongodb.ObjectId[];

    @prop()
    correlationId?: string;

    @prop({ default: null })
    status?: number;

    @prop()
    error?: string;

    @prop()
    failureCode?: number;

    @prop({ default: false })
    autoRestart?: boolean;

    @prop({ required: true })
    runtimeVars: any;

    @prop({ default: [] })
    down_dep?: string[][];

    @prop({ default: {} })
    up_dep?: any;

    @prop({ default: [] })
    attemptedRunAgentIds?: string[];

    @prop({ required: false })
    scriptsToInject?: any;
  
    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        'name': [FilterOperator.LIKE, FilterOperator.EQUALS],
        '_jobId': [FilterOperator.EQUALS]
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
            _jobId: (data) => {
                return new mongodb.ObjectId(data._jobId);
            }
        },

        fromDB: {
            // version: (data) => {
            //   return undefined; // remove the version field - api users won't see it
            // }
        }
    }
};

export const TaskModel = getModelForClass(TaskSchema);
