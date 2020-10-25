import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { TeamPaymentStatus } from '../../shared/Enums';
import { TeamPricingTier } from '../../shared/Enums';
import * as mongodb from 'mongodb';

/// TODO: change some of these to required like ownerId and inviteLink
// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'accessRight' } })
export class AccessRightSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: true })
  rightId?: number; // Use this id, not the _id/id to uniquely identify rights

  @prop({ required: true })
  name?: string;

  @prop({ required: true })
  groupId?: number;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'rightId': [FilterOperator.EQUALS, FilterOperator.IN],
    'name': [FilterOperator.EQUALS, FilterOperator.IN]
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
          return new mongodb.ObjectID(data._id);
        }
        else {
          return undefined;
        }
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api users won't see it
      // }
    }
  }
};

export const AccessRightModel = getModelForClass(AccessRightSchema);