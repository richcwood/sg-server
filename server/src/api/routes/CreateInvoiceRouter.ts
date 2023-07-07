import { Router } from 'express';
import { createInvoiceController } from '../controllers/CreateInvoiceController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class CreateInvoiceRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post('/', verifyAccessRights(['INVOICE_WRITE', 'GLOBAL']), createInvoiceController.createInvoice);
    }
}

export const createInvoiceRouterSingleton = (): CreateInvoiceRouter | any => {
    return new CreateInvoiceRouter();
};
export const createInvoiceRouter = (): any => {
    return createInvoiceRouterSingleton().router;
};
