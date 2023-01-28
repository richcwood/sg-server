import { Router } from 'express';
import { userScriptShadowCopyController } from '../controllers/UserScriptShadowCopyController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class UserScriptShadowCopyRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get(
            '/',
            verifyAccessRights(['SCRIPT_SHADOW_READ', 'GLOBAL']),
            userScriptShadowCopyController.getManyUserScriptShadowCopys
        );
        this.router.get(
            '/:userScriptShadowCopyId',
            verifyAccessRights(['SCRIPT_SHADOW_READ', 'GLOBAL']),
            userScriptShadowCopyController.getUserScriptShadowCopy
        );
        this.router.post(
            '/',
            verifyAccessRights(['SCRIPT_SHADOW_WRITE', 'GLOBAL']),
            userScriptShadowCopyController.createUserScriptShadowCopy
        );
        this.router.put(
            '/:userScriptShadowCopyId',
            verifyAccessRights(['SCRIPT_SHADOW_WRITE', 'GLOBAL']),
            userScriptShadowCopyController.updateUserScriptShadowCopy
        );
        this.router.delete(
            '/:userScriptShadowCopyId',
            verifyAccessRights(['SCRIPT_SHADOW_WRITE', 'GLOBAL']),
            userScriptShadowCopyController.deleteUserScriptShadowCopy
        );
    }
}

export const userScriptShadowCopyRouterSingleton = new UserScriptShadowCopyRouter();
export const userScriptShadowCopyRouter = userScriptShadowCopyRouterSingleton.router;
