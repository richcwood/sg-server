import { Router } from 'express';
import { teamVariableController } from '../controllers/TeamVariableController';

export class TeamVariableRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', teamVariableController.getManyTeamVariables);
    this.router.get('/:teamVariableId', teamVariableController.getTeamVariable);
    this.router.post('/', teamVariableController.createTeamVariable);
    this.router.put('/:teamVariableId', teamVariableController.updateTeamVariable);
    this.router.delete('/:teamVariableId', teamVariableController.deleteTeamVariable);
  }
}

export const teamVariableRouterSingleton = new TeamVariableRouter();
export const teamVariableRouter = teamVariableRouterSingleton.router;