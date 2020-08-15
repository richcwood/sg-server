import { Router } from 'express';
import { teamStorageController } from '../controllers/TeamStorageController';

export class TeamStorageRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', teamStorageController.getManyTeamStorages);
    this.router.get('/:teamStorageId', teamStorageController.getTeamStorage);
    this.router.post('/', teamStorageController.createTeamStorage);
    this.router.put('/:teamStorageId', teamStorageController.updateTeamStorage);
  }
}

export const teamStorageRouterSingleton = new TeamStorageRouter();
export const teamStorageRouter = teamStorageRouterSingleton.router;