import { Router } from 'express';
import { payInvoiceAutoController } from '../controllers/PayInvoiceAutoController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class PayInvoiceAutoRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post(
            '/',
            verifyAccessRights(['PAY_INVOICE_AUTO', 'GLOBAL']),
            payInvoiceAutoController.payInvoiceAuto
        );
    }
}

export const payInvoiceAutoRouterSingleton = new PayInvoiceAutoRouter();
export const payInvoiceAutoRouter = payInvoiceAutoRouterSingleton.router;
