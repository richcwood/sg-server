import { Router } from 'express';
import { userScriptShadowCopyController } from '../controllers/UserScriptShadowCopyController';

export class UserScriptShadowCopyRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', userScriptShadowCopyController.getManyUserScriptShadowCopys);
    this.router.get('/:userScriptShadowCopyId', userScriptShadowCopyController.getUserScriptShadowCopy);
    this.router.post('/', userScriptShadowCopyController.createUserScriptShadowCopy);
    this.router.put('/:userScriptShadowCopyId', userScriptShadowCopyController.updateUserScriptShadowCopy);
    this.router.delete('/:userScriptShadowCopyId', userScriptShadowCopyController.deleteUserScriptShadowCopy);
  }
}

export const userScriptShadowCopyRouterSingleton = new UserScriptShadowCopyRouter();
export const userScriptShadowCopyRouter = userScriptShadowCopyRouterSingleton.router;