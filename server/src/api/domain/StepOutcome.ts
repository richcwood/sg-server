import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { TaskSource } from '../../shared/Enums';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'stepOutcome' } })
export class StepOutcomeSchema {

    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: true })
    _jobId?: mongodb.ObjectId;

    @prop({ required: true })
    _stepId: mongodb.ObjectId;

    @prop({ required: true })
    _taskOutcomeId: mongodb.ObjectId;

    @prop({ required: false })
    _invoiceId?: mongodb.ObjectId;

    @prop({ required: true })
    machineId: string;

    @prop({ required: true })
    ipAddress: string;    

    @prop({ required: true })
    name: string;

    @prop({ required: true })
    source: TaskSource;

    @prop({ required: true })
    runCode: string;

    @prop({ default: {} })
    runtimeVars?: any;

    @prop()
    stdout?: string;

    @prop()
    stderr?: string;

    @prop()
    exitCode?: number;

    @prop()
    signal?: string;

    @prop()
    status?: number;

    @prop()
    dateStarted: Date;

    @prop()
    dateCompleted?: Date;

    @prop({ default: [] })
    tail?: string[];

    @prop({ default: 0 })
    lastUpdateId?: number;

    @prop({ default: false })
    archived?: boolean;

    @prop()
    sgcDuration?: string;

    @prop()
    sgcBilledDuration?: string;

    @prop()
    sgcMemSize?: string;

    @prop()
    sgcMaxMemUsed?: string;

    @prop()
    sgcInitDuration?: string;


    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        'name': [FilterOperator.LIKE],
        '_stepId': [FilterOperator.IN, FilterOperator.EQUALS],
        '_taskOutcomeId': [FilterOperator.EQUALS]
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
            _stepId: (data) => {
                return new mongodb.ObjectID(data._stepId);
            },
            _taskOutcomeId: (data) => {
                return new mongodb.ObjectID(data._taskOutcomeId);
            }
        },

        fromDB: {
            // version: (data) => {
            //   return undefined; // remove the version field - api users won't see it
            // }
        }
    }
};

export const StepOutcomeModel = getModelForClass(StepOutcomeSchema);