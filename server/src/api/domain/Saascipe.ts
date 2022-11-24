import {SaascipeType} from "../../shared/Enums";
import {modelOptions, prop, getModelForClass, Severity} from "@typegoose/typegoose";
import {FilterOperator} from "../utils/BulkGet";

import * as mongodb from "mongodb";

@modelOptions({schemaOptions: {collection: "saascipe"}, options: {allowMixed: Severity.ALLOW}})
export class SaascipeSchema {
  _id?: mongodb.ObjectId;

  @prop()
  id?: mongodb.ObjectId;

  @prop({required: true})
  _publisherTeamId: mongodb.ObjectId;

  @prop({required: true})
  _publisherUserId: mongodb.ObjectId;

  @prop({required: true})
  _sourceId: mongodb.ObjectId;

  @prop({required: true})
  name: string;

  @prop({required: true})
  saascipeType: SaascipeType;

  @prop({required: true})
  description: string;

  @prop({required: true})
  s3Path: string;

  @prop({default: 0})
  currentVersion: number;

  // Define which filters are legal for which props (including nested props (not sure about nested arrays))
  public static readonly validFilters = {
    name: [FilterOperator.LIKE],
    saascipeType: [FilterOperator.EQUALS],
  };

  // 2 way map between field values the API client sees and what is stored in the database.  Allows client to use 'id' and database to use '_id'
  public static readonly propAliases = {
    _id: "id",
    id: "_id",
    __v: "version",
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

export const SaascipeModel = getModelForClass(SaascipeSchema);
