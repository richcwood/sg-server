import { Router } from 'express';
import { settingsController } from '../controllers/SettingsController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class SettingsRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['SETTINGS_READ', 'GLOBAL']), settingsController.getManySettings);
        this.router.get('/:type', verifyAccessRights(['SETTINGS_READ', 'GLOBAL']), settingsController.getSettings);
        this.router.post('/', verifyAccessRights(['SETTINGS_WRITE', 'GLOBAL']), settingsController.createSettings);
        this.router.put('/:type', verifyAccessRights(['SETTINGS_WRITE', 'GLOBAL']), settingsController.updateSettings);
        this.router.delete(
            '/:type',
            verifyAccessRights(['SETTINGS_WRITE', 'GLOBAL']),
            settingsController.deleteSettings
        );
    }
}

export const settingsRouterSingleton = new SettingsRouter();
export const settingsRouter = settingsRouterSingleton.router;
