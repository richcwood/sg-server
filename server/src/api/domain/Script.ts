import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';

// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'script' }, options: { allowMixed: Severity.ALLOW } })
export class ScriptSchema {
    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _teamId: mongodb.ObjectId;

    @prop({ required: true })
    name: string;

    @prop({ required: true })
    scriptType: number;

    @prop({ required: true })
    code: string;

    @prop({ required: true })
    _originalAuthorUserId: mongodb.ObjectId;

    @prop({ required: true })
    _lastEditedUserId: mongodb.ObjectId;

    @prop({ default: true })
    teamUsable?: boolean;

    @prop({ default: false })
    teamEditable?: boolean;

    @prop({ required: true })
    lastEditedDate: Date;

    @prop()
    shadowCopyCode?: string;

    @prop({ default: true })
    isActive?: boolean;

    @prop({ required: false })
    sggElems?: string[];

    @prop({ required: false })
    sgoElems?: string[];

    @prop({ required: false })
    sgsElems?: string[];

    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        name: [FilterOperator.LIKE],
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
            // _originalAuthorUserId: (data) => {
            //   return new mongodb.ObjectId(data._originalAuthorUserId);
            // },
            // _lastEditedUserId: (data) => {
            //   return new mongodb.ObjectId(data._lastEditedUserId);
            // }
        },

        fromDB: {
            // _originalAuthorUserId: (data) => {
            //   return new mongodb.ObjectId(data._originalAuthorUserId);
            // },
            // _lastEditedUserId: (data) => {
            //   return new mongodb.ObjectId(data._lastEditedUserId);
            // }
        },
    };
}

export const ScriptModel = getModelForClass(ScriptSchema);
