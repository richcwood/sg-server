import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'schedule', minimize: false }, options: { allowMixed: Severity.ALLOW } })
export class ScheduleSchema {

    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: true })
    _jobDefId: mongodb.ObjectId;

    @prop({ required: true })
    name: string;

    @prop({ required: true })
    createdBy: mongodb.ObjectId;

    @prop({ required: true })
    lastUpdatedBy: mongodb.ObjectId;

    @prop()
    lastScheduledRunDate?: Date;

    @prop()
    nextScheduledRunDate?: Date;

    @prop({ default: false })
    isActive?: boolean;

    @prop({ required: true })
    TriggerType: string;

    @prop({ required: false })
    misfire_grace_time?: number;

    @prop({ required: false })
    coalesce?: boolean;

    @prop({ required: false })
    max_instances?: number;

    @prop({ required: false })
    RunDate?: string;

    @prop({ default: {} })
    cron?: {
        Year: string,
        Month: string,
        Day: string,
        Week: string,
        Day_Of_Week: string,
        Hour: string,
        Minute: string,
        Second: string,
        Start_Date: string,
        End_Date: string,
        Timezone: string,
        Jitter: string
    };

    @prop({ default: {} })
    interval?: {
        Weeks: number,
        Days: number,
        Hours: number,
        Minutes: number,
        Start_Date: string,
        End_Date: string,
        Jitter: number
    };

    @prop()
    scheduleError?: string;

    @prop({ required: true })
    FunctionKwargs: {
        _teamId: mongodb.ObjectId,
        targetId: mongodb.ObjectId,
        runtimeVars: any
    };

    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        'name': [FilterOperator.LIKE, FilterOperator.EQUALS],
        '_jobDefId': [FilterOperator.EQUALS],
        'nextScheduledRunDate': [FilterOperator.GREATER_THAN, FilterOperator.LESS_THAN]
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
            'FunctionKwargs._teamId': (data) => {
                return new mongodb.ObjectId(data.FunctionKwargs._teamId);
            },
            'FunctionKwargs.targetId': (data) => {
                return new mongodb.ObjectId(data.FunctionKwargs.targetId);
            }
        },

        fromDB: {
            // version: (data) => {
            //   return undefined; // remove the version field - api users won't see it
            // }
        }
    }
};

export const ScheduleModel = getModelForClass(ScheduleSchema);