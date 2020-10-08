import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { TeamPaymentStatus } from '../../shared/Enums';
import { TeamPricingTier } from '../../shared/Enums';
import * as mongodb from 'mongodb';

/// TODO: change some of these to required like ownerId and inviteLink
// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'team' } })
export class TeamSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: false })
  name?: string;

  @prop({ required: false })
  ownerId?: mongodb.ObjectId;

  @prop({ default: '' })
  billing_address1?: string;

  @prop({ default: '' })
  billing_address2?: string;

  @prop({ default: '' })
  billing_city?: string;

  @prop({ default: '' })
  billing_state?: string;

  @prop({ default: '' })
  billing_zip?: string;

  @prop({ default: '' })
  billing_email?: string;

  @prop({ default: false })
  isActive?: boolean;

  @prop({ required: false})
  rmqPassword?: string;

  @prop()
  defaultTimeZone?: string;

  // @prop({ required: false })
  // defaultPaymentMethodId?: mongodb.ObjectId;

  @prop({ default: TeamPaymentStatus.HEALTHY })
  paymentStatus?: TeamPaymentStatus;

  @prop({ default: new Date() })
  paymentStatusDate?: Date;

  @prop({ required: false })
  jobIdHighWatermark?: mongodb.ObjectId;

  @prop({ default: 0 })
  jobStorageSpaceHighWatermark?: number;

  @prop({ required: false })
  scriptRate?: number;

  @prop({ default: 0 })
  paidStorageMB?: number;

  @prop({ required: false })
  jobStoragePerMBRate?: number;

  @prop({ default: TeamPricingTier.FREE })
  pricingTier?: TeamPricingTier;

  @prop({ required: false })
  inviteLink?: string;

  @prop({ default: [] })
  notes?: { date: Date, csr: string, note: string }[];

  @prop({ default: {} })
  agent_install: any;

  @prop({ default: {} })
  agent_stub_install: any;

  @prop()
  onJobTaskFailAlertEmail?: string;

  @prop()
  onJobCompleteAlertEmail?: string;

  @prop()
  onJobTaskInterruptedAlertEmail?: string;

  @prop()
  onJobTaskFailAlertSlackURL?: string;

  @prop()
  onJobCompleteAlertSlackURL?: string;

  @prop()
  onJobTaskInterruptedAlertSlackURL?: string;

  @prop({ default: false })
  userAssigned: boolean;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE],
    'paymentStatusDate': [FilterOperator.LESS_THAN],
    'id': [FilterOperator.IN],
    'userAssigned': [FilterOperator.EQUALS],
    'isActive': [FilterOperator.EQUALS]
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

export const TeamModel = getModelForClass(TeamSchema);