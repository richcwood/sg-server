import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'userScriptShadowCopy' } })
export class UserScriptShadowCopySchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: true })
  _teamId: mongodb.ObjectId;

  @prop({ required: true })
  _userId: mongodb.ObjectId;

  @prop({ required: true })
  _scriptId: mongodb.ObjectId;

  @prop({ required: true })
  shadowCopyCode: string;

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
      // _originalAuthorUserId: (data) => {
      //   return new mongodb.ObjectID(data._originalAuthorUserId);
      // },
      // _lastEditedUserId: (data) => {
      //   return new mongodb.ObjectID(data._lastEditedUserId);
      // }
    },

    fromDB: {
      // _originalAuthorUserId: (data) => {
      //   return new mongodb.ObjectID(data._originalAuthorUserId);
      // },
      // _lastEditedUserId: (data) => {
      //   return new mongodb.ObjectID(data._lastEditedUserId);
      // }
    }
  }
};

export const UserScriptShadowCopyModel = getModelForClass(UserScriptShadowCopySchema);