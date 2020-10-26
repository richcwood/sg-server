import { modelOptions, prop, arrayProp, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import Bitset from 'bitset';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'user' } })
export class UserSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ default: new Date().toISOString() })
  dateCreated: Date;

  @prop({ required: false })
  name?: string;

  @prop({ required: false })
  companyName?: string;

  @prop({ default: [] })
  teamIds?: string[];

  @prop({ default: [] })
  teamIdsInactive?: string[];

  @prop({ default: []})
  teamIdsInvited?: { _teamId: string, inviteKey: string }[];

  @prop({default: []})
  accessRightIds?: number[];

  @prop({ default: {} })
  teamAccessRightIds?: {[_teamId: string] : number[]};

  @prop({ required: true })
  email: string;

  @prop({ required: false })
  passwordHash?: string;

  @prop({ default: false })
  emailConfirmed: boolean;

  @prop()
  emailConfirmCode?: string;

  @prop()
  emailConfirmCodeExpiration?: Date;

  @prop({ default: false })
  hasAcceptedTerms?: boolean;

  @prop({ required: false })
  lastLogin?: string;


  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE],
    'email': [FilterOperator.EQUALS]
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

  // Helper to convert a user's teamAccessRightIds into bitsets
  public static convertTeamAccessRightsToBitset(user: UserSchema){
    if(user.teamAccessRightIds){
      const bitsets = {};
      for(let teamId of Object.keys(user.teamAccessRightIds)){
        const accessRightIds = user.teamAccessRightIds[teamId];
        const bitset = new Bitset();
        for(let accessRightId of accessRightIds){
          bitset.set(accessRightId, 1);
        }
        bitsets[teamId] = bitset.toString(16); // more efficient as hex
      }
      return bitsets;
    }
    else {
      return {};
    }
  }

  // Converters for values to/from the database.  Converter functions take the entire model
  public static readonly dataConverters = {
    // This isn't hooked up yet until needed - if it does, then call this in the controller layer on data before passing to service
    toDB: {
      _id: (data) => {
        return new mongodb.ObjectID(data._id);
      }
    },

    fromDB: {
      teamAccessRightIds: (user: UserSchema) => {
        return UserSchema.convertTeamAccessRightsToBitset(user);
      }

      // version: (data) => {
      //   return undefined; // remove the version field - api users won't see it
      // }
    }
  }
};

export const UserModel = getModelForClass(UserSchema);