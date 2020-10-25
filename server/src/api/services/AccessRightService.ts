import { AccessRightModel } from '../domain/AccessRight';

// Probably only used to get the access right definitions - shared across all teams
export class AccessRightService {
    public async findAllAccessRights(responseFields?: string) {
        return AccessRightModel.find({}).select(responseFields);
    }
}

export const accessRightService = new AccessRightService();