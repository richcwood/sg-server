import { convertData } from '../utils/ResponseConverters';
import { SettingsSchema, SettingsModel } from '../domain/Settings';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';


export class SettingsService {

  // Some services might need to add additional restrictions to bulk queries
  // This is how they would add more to the base query (Example: fetch only non-deleted users for all queries)
  // public async updateBulkQuery(query): Promise<object> {
  //   // modify query here
  //   return query;
  // }


  public async findAllSettingsInternal(filter?: any, responseFields?: string) {
    return SettingsModel.find(filter).select(responseFields);
  }


  public async findSettings(Type: string) {
    const settings = await SettingsModel.find({ Type });

    if (_.isArray(settings) && settings.length === 0) {
      throw new MissingObjectError(`Settings for ${Type} not found.`);
    }
    else {
      return settings[0].Values
    }
  }


  public async createSettingsInternal(data: any): Promise<object> {
    const model = new SettingsModel(data);
    await model.save();
    return;
  }


  public async createSettings(data: any): Promise<object> {
    const settingsModel = new SettingsModel(data);
    const newSettings = await settingsModel.save();

    return newSettings; // fully populated model
  }


  public async updateSettings(id: mongodb.ObjectId, data: any): Promise<object> {
    const updatedSettings = await SettingsModel.findOneAndUpdate({ _id: id }, data, { new: true });

    if (!updatedSettings)
      throw new MissingObjectError(`Settings with id '${id}' not found.`)

    return updatedSettings; // fully populated model
  }
}

export const settingsService = new SettingsService();