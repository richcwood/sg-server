import { Router } from 'express';
import { teamAdminAccessController } from '../controllers/TeamAdminAccessController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TeamAdminAccessRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post(
            '/grant/:userId',
            verifyAccessRights(['TEAM_GLOBAL', 'GLOBAL']),
            teamAdminAccessController.grantTeamAdminAccess
        );
        this.router.post(
            '/revoke/:userId',
            verifyAccessRights(['TEAM_GLOBAL', 'GLOBAL']),
            teamAdminAccessController.revokeTeamAdminAccess
        );
    }
}

export const teamAdminAccessRouterSingleton = new TeamAdminAccessRouter();
export const teamAdminAccessRouter = teamAdminAccessRouterSingleton.router;
