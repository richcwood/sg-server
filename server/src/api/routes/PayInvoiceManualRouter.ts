import { Router } from 'express';
import { payInvoiceManualController } from '../controllers/PayInvoiceManualController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class PayInvoiceManualRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.post(
            '/',
            verifyAccessRights(['PAY_INVOICE_MANUAL', 'GLOBAL']),
            payInvoiceManualController.payInvoiceManual
        );
    }
}

export const payInvoiceManualRouterSingleton = new PayInvoiceManualRouter();
export const payInvoiceManualRouter = payInvoiceManualRouterSingleton.router;
