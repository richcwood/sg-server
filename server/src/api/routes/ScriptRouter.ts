import { Router } from 'express';
import { scriptController } from '../controllers/ScriptController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class ScriptRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['SCRIPT_READ', 'GLOBAL']), scriptController.getManyScripts);
        this.router.get('/:scriptId', verifyAccessRights(['SCRIPT_READ', 'GLOBAL']), scriptController.getScript);
        this.router.post('/', verifyAccessRights(['SCRIPT_WRITE', 'GLOBAL']), scriptController.createScript);
        this.router.put('/:scriptId', verifyAccessRights(['SCRIPT_WRITE', 'GLOBAL']), scriptController.updateScript);
        this.router.delete('/:scriptId', verifyAccessRights(['SCRIPT_WRITE', 'GLOBAL']), scriptController.deleteScript);
    }
}

export const scriptRouterSingleton = new ScriptRouter();
export const scriptRouter = scriptRouterSingleton.router;
