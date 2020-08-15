import { Router } from 'express';
import { teamController } from '../controllers/TeamController';

export class TeamRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  teamController.getManyTeams);
    this.router.get('/:teamId', teamController.getTeam);
    this.router.post('/', teamController.createTeam);
    this.router.put('/:teamId', teamController.updateTeam);
  }
}

export const teamRouterSingleton = new TeamRouter();
export const teamRouter = teamRouterSingleton.router;