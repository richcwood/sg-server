import { Router } from 'express';
import { teamController } from '../controllers/TeamController';
const cors = require('cors');

export class TeamRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', cors(),  teamController.getManyTeams);
    this.router.get('/:teamId', cors(), teamController.getTeam);
    this.router.post('/', cors(), teamController.createTeam);
    this.router.post('/unassigned', cors(), teamController.createUnassignedTeam);
    this.router.put('/:teamId', cors(), teamController.updateTeam);
  }
}

export const teamRouterSingleton = new TeamRouter();
export const teamRouter = teamRouterSingleton.router;