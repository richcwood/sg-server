import { AccessRightModel } from '../domain/AccessRight';

// Probably only used to get the access right definitions - shared across all teams
export class AccessRightService {
    public async findAllAccessRights(responseFields?: string) {
        return AccessRightModel.find({}).select(responseFields);
    }


    public async createAccessRightInternal(data: any): Promise<object> {
        const model = new AccessRightModel(data);
        await model.save();
        return;
    }
}

export const accessRightService = new AccessRightService();