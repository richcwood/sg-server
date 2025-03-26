import { modelOptions, prop, getModelForClass, Severity } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';

import * as mongodb from 'mongodb';

interface IRuntimeVariable {
    name: string;
    description: string;
}

@modelOptions({ schemaOptions: { collection: 'saascipeVersion' }, options: { allowMixed: Severity.ALLOW } })
export class SaascipeVersionSchema {
    _id?: mongodb.ObjectId;

    @prop()
    id?: mongodb.ObjectId;

    @prop({ required: true })
    _publisherTeamId: mongodb.ObjectId;

    @prop({ required: true })
    _publisherUserId: mongodb.ObjectId;

    @prop({ required: true })
    _saascipeId: mongodb.ObjectId;

    @prop({ required: true })
    saascipeDef: any;

    @prop({ default: 0 })
    version: number;

    @prop({ default: '' })
    description: string;

    @prop()
    s3Path?: string;

    @prop({ default: [] })
    runtimeVarDescriptions?: Array<IRuntimeVariable>;

    // Define which filters are legal for which props (including nested props (not sure about nested arrays))
    public static readonly validFilters = {
        _publisherTeamId: [FilterOperator.EQUALS],
        _publisherUserId: [FilterOperator.EQUALS],
        version: [FilterOperator.EQUALS],
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
        },

        fromDB: {
            // version: (data) => {
            //   return undefined; // remove the version field - api artifacts won't see it
            // }
        },
    };
}

export const SaascipeVersionModel = getModelForClass(SaascipeVersionSchema);
