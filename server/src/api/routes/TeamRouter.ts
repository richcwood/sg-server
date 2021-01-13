import { Router } from 'express';
import { teamController } from '../controllers/TeamController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TeamRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['TEAM_READ', 'GLOBAL']),  teamController.getManyTeams);
    this.router.get('/:teamId', verifyAccessRights(['TEAM_CREATE', 'GLOBAL']), teamController.getTeam);
    this.router.post('/', teamController.createTeam);
    this.router.post('/unassigned', verifyAccessRights(['TEAM_CREATE_UNASSIGNED', 'GLOBAL']), teamController.createUnassignedTeam);
    this.router.put('/:teamId', verifyAccessRights(['TEAM_UPDATE', 'GLOBAL']), teamController.updateTeam);
  }
}

export const teamRouterSingleton = new TeamRouter();
export const teamRouter = teamRouterSingleton.router;