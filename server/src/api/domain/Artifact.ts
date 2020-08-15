import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'artifact' } })
export class ArtifactSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: true })
  _teamId: mongodb.ObjectId;

  @prop({ required: true })
  name: string;

  @prop({ default: '' })
  prefix?: string;

  @prop({ required: true })
  s3Path: string;

  @prop({ default: 'multipart/form-data' })
  type: string;

  @prop({ default: '' })
  url?: string;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE],
    'prefix': [FilterOperator.LIKE]
  };

  // 2 way map between field values the API client sees and what is stored in the database.  Allows client to use 'id' and database to use '_id'
  public static readonly propAliases = {
    '_id': 'id',
    'id': '_id',
    '__v': 'version'
  };

  // Converters for values to/from the database.  Converter functions take the entire model
  public static readonly dataConverters = {
    toDB: {
      _id: (data) => {
        return new mongodb.ObjectID(data._id);
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api artifacts won't see it
      // }
    }
  }
};

export const ArtifactModel = getModelForClass(ArtifactSchema);