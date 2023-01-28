import { Router } from 'express';
import { invoiceController } from '../controllers/InvoiceController';
import { verifyAccessRights } from '../utils/AccessRightsVerifier';

export class InvoiceRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();

        this.router.get('/', verifyAccessRights(['INVOICE_READ', 'GLOBAL']), invoiceController.getManyInvoices);
        this.router.get('/:invoiceId', verifyAccessRights(['INVOICE_READ', 'GLOBAL']), invoiceController.getInvoice);
        this.router.get(
            '/pdf/:invoiceId',
            verifyAccessRights(['INVOICE_READ', 'GLOBAL']),
            invoiceController.getInvoicePDF
        );
        this.router.post('/', verifyAccessRights(['INVOICE_WRITE', 'GLOBAL']), invoiceController.createInvoice);
        this.router.put(
            '/:invoiceId',
            verifyAccessRights(['INVOICE_WRITE', 'GLOBAL']),
            invoiceController.updateInvoice
        );
    }
}

export const invoiceRouterSingleton = new InvoiceRouter();
export const invoiceRouter = invoiceRouterSingleton.router;
