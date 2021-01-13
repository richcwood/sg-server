import { Router } from 'express';
import { teamInviteController } from '../controllers/TeamInviteController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TeamInviteRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/direct', verifyAccessRights(['TEAM_INVITE', 'GLOBAL']), teamInviteController.inviteUserToTeamDirect);
  }
}

export const teamInviteRouterSingleton = new TeamInviteRouter();
export const teamInviteRouter = teamInviteRouterSingleton.router;