import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { TaskDefTarget, TaskSource } from '../../shared/Enums';
import * as mongodb from 'mongodb';

// Example of a schema / domain in Mongoose
@modelOptions({
    schemaOptions: { collection: 'taskOutcome', minimize: false },
    options: { allowMixed: Severity.ALLOW },
})
export class TaskOutcomeSchema {
    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: true })
    _jobId?: mongodb.ObjectId;

    @prop({ required: true })
    _taskId: mongodb.ObjectId;

    @prop({ required: false })
    _agentId?: mongodb.ObjectId;

    @prop({ required: false })
    sourceTaskRoute?: any;

    @prop({ required: true })
    source: TaskSource;

    @prop({ required: true })
    target: TaskDefTarget;

    @prop()
    status?: number;

    @prop()
    route?: string;

    @prop({ required: false })
    correlationId?: string;

    @prop()
    failureCode?: number;

    @prop({ required: false })
    dateStarted?: Date;

    @prop()
    dateCompleted?: Date;

    @prop({ required: false })
    ipAddress?: string;

    @prop({ required: false })
    machineId?: string;

    @prop({ required: false })
    artifactsDownloadedSize?: number;

    @prop({ required: true })
    runtimeVars: any;

    @prop()
    autoRestart: boolean;

    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        name: [FilterOperator.LIKE],
        _taskId: [FilterOperator.IN, FilterOperator.EQUALS],
        _jobId: [FilterOperator.EQUALS],
    };

    // 2 way map between field values the API client sees and what is stored in the database.  Allows client to use 'id' and database to use '_id'
    public static readonly propAliases = {
        _id: 'id',
        id: '_id',
        __v: 'version',
    };

    // Converters for values to/from the database.  Converter functions take the entire model
    public static readonly dataConverters = {
        toDB: {
            _id: (data) => {
                return new mongodb.ObjectId(data._id);
            },
            _teamId: (data) => {
                return new mongodb.ObjectId(data._teamId);
            },
            _jobId: (data) => {
                return new mongodb.ObjectId(data._jobId);
            },
            _taskId: (data) => {
                return new mongodb.ObjectId(data._taskId);
            },
            _agentId: (data) => {
                return new mongodb.ObjectId(data._agentId);
            },
        },

        fromDB: {
            // version: (data) => {
            //   return undefined; // remove the version field - api users won't see it
            // }
        },
    };
}

export const TaskOutcomeModel = getModelForClass(TaskOutcomeSchema);
