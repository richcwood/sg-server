import { Router } from 'express';
import { teamVariableController } from '../controllers/TeamVariableController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class TeamVariableRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['TEAM_VAR_READ', 'GLOBAL']), teamVariableController.getManyTeamVariables);
    this.router.get('/:teamVariableId', verifyAccessRights(['TEAM_VAR_READ', 'GLOBAL']), teamVariableController.getTeamVariable);
    this.router.post('/', verifyAccessRights(['TEAM_VAR_WRITE', 'GLOBAL']), teamVariableController.createTeamVariable);
    this.router.put('/:teamVariableId', verifyAccessRights(['TEAM_VAR_WRITE', 'GLOBAL']), teamVariableController.updateTeamVariable);
    this.router.delete('/:teamVariableId', verifyAccessRights(['TEAM_VAR_WRITE', 'GLOBAL']), teamVariableController.deleteTeamVariable);
  }
}

export const teamVariableRouterSingleton = new TeamVariableRouter();
export const teamVariableRouter = teamVariableRouterSingleton.router;