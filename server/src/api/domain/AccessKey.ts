import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';
import { AccessKeyType } from '../../shared/Enums';

/// TODO: change some of these to required like ownerId and inviteLink
// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'accessKey' } })
export class AccessKeySchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;
  
  @prop({ required: true })
  _teamId: string;

  @prop({ required: true })
  createdBy: mongodb.ObjectId;

  @prop({ required: true })
  accessKeyId?: string;

  @prop({ required: true })
  accessKeySecret?: string;

  @prop({ required: true })
  accessKeyType?: AccessKeyType;

  @prop({ required: true })
  description?: string;

  @prop({ required: false })
  expiration?: number;

  @prop({ required: false })
  revokeTime?: number;

  @prop({ default: {} })
  accessRightIds?: number[];

  @prop({ required: false })
  lastUsed?: number;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'accessKeyId': [FilterOperator.EQUALS, FilterOperator.IN]
  };

  // 2 way map between field values the API client sees and what is stored in the database.  Allows client to use 'id' and database to use '_id'
  public static readonly propAliases = {
    '_id': 'id',
    'id': '_id'
  };

  // Converters for values to/from the database.  Converter functions take the entire model
  public static readonly dataConverters = {
    // This isn't hooked up yet until needed - if it does, then call this in the controller layer on data before passing to service
    toDB: {
      _id: (data) => {
        if(data && data._id){
          return new mongodb.ObjectId(data._id);
        }
        else {
          return undefined;
        }
      }
    },

    fromDB: {
      accessKeySecret: (data) => {
        return undefined; // remove the version field - api users won't see it
      }
    } 
  }
};

export const AccessKeyModel = getModelForClass(AccessKeySchema);