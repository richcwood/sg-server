import { SettingsSchema, SettingsModel } from '../domain/Settings';
import { MissingObjectError } from '../utils/Errors';
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
        } else {
            return settings[0].Values;
        }
    }

    public async createSettingsInternal(data: any): Promise<object> {
        const model = new SettingsModel(data);
        await model.save();
        return;
    }

    public async createSettings(data: any): Promise<SettingsSchema> {
        const settingsModel = new SettingsModel(data);
        const newSettings = await settingsModel.save();

        return newSettings; // fully populated model
    }

    public async updateSettings(type: string, data: any): Promise<object> {
        data.Type = type;
        let newSettings: any;
        const existingSettings = await this.findAllSettingsInternal({ Type: type }, '_id');
        if (_.isArray(existingSettings) && existingSettings.length > 0) {
            newSettings = await SettingsModel.findOneAndUpdate({ Type: type }, data, { new: true });
        } else {
            const settingsModel = new SettingsModel(data);
            newSettings = await settingsModel.save();
        }

        return newSettings;
    }

    public async deleteSettings(type: string): Promise<object> {
        const deleted = await SettingsModel.deleteOne({ Type: type });

        return deleted;
    }
}

export const settingsService = new SettingsService();
