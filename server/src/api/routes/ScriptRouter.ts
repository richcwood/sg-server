import { Router } from 'express';
import { scriptController } from '../controllers/ScriptController';

export class ScriptRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/',  scriptController.getManyScripts);
    this.router.get('/:scriptId', scriptController.getScript);
    this.router.post('/', scriptController.createScript);
    this.router.put('/:scriptId', scriptController.updateScript);
  }
}

export const scriptRouterSingleton = new ScriptRouter();
export const scriptRouter = scriptRouterSingleton.router;