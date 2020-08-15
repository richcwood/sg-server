import { Router } from 'express';
import { teamInviteController } from '../controllers/TeamInviteController';

export class TeamInviteRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.post('/direct', teamInviteController.inviteUserToTeamDirect);
  }
}

export const teamInviteRouterSingleton = new TeamInviteRouter();
export const teamInviteRouter = teamInviteRouterSingleton.router;