import { Router } from 'express';
import { teamController } from '../controllers/TeamController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TeamRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', teamController.getManyTeams);
        this.router.get('/:teamId', verifyAccessRights(['TEAM_READ', 'GLOBAL']), teamController.getTeam);
        this.router.post('/', teamController.createTeam);
        this.router.post(
            '/unassigned',
            verifyAccessRights(['TEAM_CREATE_UNASSIGNED', 'GLOBAL']),
            teamController.createUnassignedTeam
        );
        this.router.put('/:teamId', verifyAccessRights(['TEAM_WRITE', 'GLOBAL']), teamController.updateTeam);
    }
}

export const teamRouterSingleton = (): TeamRouter | any => {
    return new TeamRouter();
};
export const teamRouter = (): any => {
    return teamRouterSingleton().router;
};
