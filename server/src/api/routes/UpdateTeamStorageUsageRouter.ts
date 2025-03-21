import { Router } from 'express';
import { updateTeamStorageUsageController } from '../controllers/UpdateTeamStorageUsageController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class UpdateTeamStorageUsageRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post(
            '/',
            verifyAccessRights(['TEAM_STORAGE_WRITE', 'GLOBAL']),
            updateTeamStorageUsageController.updateTeamStorageUsage
        );
    }
}

export const updateTeamStorageUsageRouterSingleton = (): UpdateTeamStorageUsageRouter | any => {
    return new UpdateTeamStorageUsageRouter();
};
export const updateTeamStorageUsageRouter = (): any => {
    return updateTeamStorageUsageRouterSingleton().router;
};
