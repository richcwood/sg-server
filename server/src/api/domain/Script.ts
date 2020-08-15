import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'script' } })
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
  _originalAuthorUserId: string;

  @prop({ required: true })
  _lastEditedUserId: string;

  @prop({ default: true })
  teamUsable?: boolean;

  @prop({ default: false })
  teamEditable?: boolean;

  @prop({ required: true })
  lastEditedDate: Date;

  @prop({ required: true })
  shadowCopyCode: string;

  @prop({ default: true })
  isActive?: boolean;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
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
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api users won't see it
      // }
    }
  }
};

export const ScriptModel = getModelForClass(ScriptSchema);