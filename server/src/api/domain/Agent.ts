import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';

// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'agent', minimize: false }, options: { allowMixed: Severity.ALLOW } })
export class AgentSchema {
    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: true })
    machineId: string;

    @prop({ required: true })
    ipAddress: string;

    @prop({ required: true })
    createDate: Date;

    @prop()
    name?: string;

    @prop({ default: {} })
    tags?: any;

    @prop({ default: 0 })
    numActiveTasks?: number;

    @prop({ default: new Date().getTime() })
    lastHeartbeatTime?: number;

    @prop({ default: false })
    offline?: boolean;

    @prop({ default: {} })
    sysInfo?: any;

    @prop({ default: '' })
    cron?: string;

    @prop()
    rmqPassword?: string;

    @prop({ required: true })
    reportedVersion: string;

    @prop({ required: true })
    targetVersion: string;

    @prop({ default: {} })
    propertyOverrides?: any;

    @prop()
    inactiveAgentQueueTTL?: string;

    @prop()
    rmqUrl?: string;

    @prop()
    rmqStompPort?: string;

    @prop()
    rmqAdminPort?: string;

    @prop()
    useSSL?: string;

    @prop()
    rmqVhost?: string;

    @prop()
    timezone?: string;

    @prop()
    lastTaskAssignedTime?: number;

    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        name: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.LIKE],
        machineId: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.LIKE],
        ipAddress: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.LIKE],
        createDate: [
            FilterOperator.EQUALS,
            FilterOperator.GREATER_THAN,
            FilterOperator.GREATER_THAN_EQUAL_TO,
            FilterOperator.LESS_THAN,
            FilterOperator.LESS_THAN_EQUAL_TO,
            FilterOperator,
        ],
        tags: [FilterOperator.EQUALS],
        offline: [FilterOperator.EQUALS],
        lastHeartbeatTime: [FilterOperator.LESS_THAN, FilterOperator.GREATER_THAN_EQUAL_TO],
        targetVersion: [FilterOperator.EQUALS],
        reportedVersion: [FilterOperator.EQUALS],
        // 'dog.name': [FilterOperator.IN, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.LIKE
        // ],
        // 'dog.smell': [FilterOperator.LIKE],
        // firstName: [FilterOperator.IN, FilterOperator.LIKE, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
        // lastName: [FilterOperator.IN, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
        // id: [FilterOperator.EQUALS, FilterOperator.IN]
    };

    // 2 way map between field values the API client sees and what is stored in the database.  Allows client to use 'id' and database to use '_id'
    public static readonly propAliases = {
        _id: 'id',
        id: '_id',
        __v: 'version',
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
        },

        fromDB: {},
    };
}

export const AgentModel = getModelForClass(AgentSchema);
