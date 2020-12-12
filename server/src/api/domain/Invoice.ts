import { modelOptions, prop, getModelForClass } from '@typegoose/typegoose';
import { FilterOperator } from '../utils/BulkGet';
import { InvoiceStatus } from '../../shared/Enums';
import { AccessRight } from '../../shared/Enums';
import * as mongodb from 'mongodb';


// Example of a schema / domain in Mongoose
@modelOptions({ schemaOptions: { collection: 'invoice' } })
export class InvoiceSchema {

  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({ required: true })
  _teamId: mongodb.ObjectId;

  @prop({ required: true })
  month: number;

  @prop({ required: true })
  year: number;

  @prop({ required: true })
  startDate: Date;

  @prop({ required: true })
  endDate: Date;

  @prop({ required: false })
  dueDate?: Date;

  @prop({ required: true })
  scriptRate: number;

  @prop({ required: true })
  numScripts: number;

  @prop({ required: true })
  numICScripts: number;

  @prop({ required: true })
  jobStoragePerMBRate: number;

  @prop({ required: true })
  storageMB: number;

  @prop({ required: true })
  artifactsDownloadedPerGBRate: number;

  @prop({ required: true })
  artifactsDownloadedGB: number;

  @prop({ required: true })
  artifactsStoragePerGBRate: number;

  @prop({ required: true })
  artifactsStorageGB: number;

  @prop({ required: true })
  newAgentRate: number;

  @prop({ required: true })
  numNewAgents: number;

  @prop({ required: true })
  billAmount: number;

  @prop({ required: true })
  paidAmount: number;

  @prop({ default: InvoiceStatus.CREATED })
  status: InvoiceStatus;

  @prop({ required: false })
  pdfLocation: string;

  @prop({ required: false })
  note?: { date: Date, by: string, note: string };

  @prop({ default: '' })
  url?: string;


  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    'name': [FilterOperator.LIKE],
    'status': [FilterOperator.IN, FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.LESS_THAN, FilterOperator.LESS_THAN_EQUAL_TO, FilterOperator.GREATER_THAN, FilterOperator.GREATER_THAN_EQUAL_TO]
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
    toDB: {
      _id: (data) => {
        return new mongodb.ObjectID(data._id);
      }
    },

    fromDB: {
      // version: (data) => {
      //   return undefined; // remove the version field - api invoices won't see it
      // }
    }
  }
};

export const InvoiceModel = getModelForClass(InvoiceSchema);