import { Router } from 'express';
import { invoiceController } from '../controllers/InvoiceController';

export class InvoiceRouter {

  public readonly router: Router;

  constructor() {
    this.router = Router();

    this.router.get('/', invoiceController.getManyInvoices);
    this.router.get('/:invoiceId', invoiceController.getInvoice);
    this.router.get('/pdf/:invoiceId', invoiceController.getInvoicePDF);
    this.router.post('/', invoiceController.createInvoice);
    this.router.put('/:invoiceId', invoiceController.updateInvoice);
  }
}

export const invoiceRouterSingleton = new InvoiceRouter();
export const invoiceRouter = invoiceRouterSingleton.router;