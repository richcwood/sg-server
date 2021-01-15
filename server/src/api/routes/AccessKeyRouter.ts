import { Router } from 'express';
import { accessKeyController } from '../controllers/AccessKeyController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class AccessKeyRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', verifyAccessRights(['ACCESSKEY_READ', 'GLOBAL']), accessKeyController.getManyAccessKeys);
    this.router.get('/:accessKeyId', verifyAccessRights(['ACCESSKEY_READ', 'GLOBAL']), accessKeyController.getAccessKey);
    this.router.post('/', verifyAccessRights(['ACCESSKEY_CREATE', 'GLOBAL']), accessKeyController.createAccessKey);
    this.router.put('/:accessKeyId', verifyAccessRights(['ACCESSKEY_UPDATE', 'GLOBAL']), accessKeyController.updateAccessKey);
    this.router.delete('/:accessKeyId', verifyAccessRights(['ACCESSKEY_DELETE', 'GLOBAL']), accessKeyController.deleteAccessKey);
  }
}

export const accessKeyRouterSingleton = new AccessKeyRouter();
export const accessKeyRouter = accessKeyRouterSingleton.router;
