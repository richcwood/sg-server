import { Router } from 'express';
import { teamStorageController } from '../controllers/TeamStorageController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TeamStorageRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get(
            '/',
            verifyAccessRights(['TEAM_STORAGE_READ', 'GLOBAL']),
            teamStorageController.getManyTeamStorages
        );
        this.router.get(
            '/:teamStorageId',
            verifyAccessRights(['TEAM_STORAGE_READ', 'GLOBAL']),
            teamStorageController.getTeamStorage
        );
        this.router.post(
            '/',
            verifyAccessRights(['TEAM_STORAGE_WRITE', 'GLOBAL']),
            teamStorageController.createTeamStorage
        );
        this.router.put(
            '/:teamStorageId',
            verifyAccessRights(['TEAM_STORAGE_WRITE', 'GLOBAL']),
            teamStorageController.updateTeamStorage
        );
    }
}

export const teamStorageRouterSingleton = new TeamStorageRouter();
export const teamStorageRouter = teamStorageRouterSingleton.router;
