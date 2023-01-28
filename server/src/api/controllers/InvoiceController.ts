import { Request, Response, NextFunction, response } from 'express';
import { ResponseWrapper, ResponseCode } from '../utils/Types';
import { InvoiceSchema, InvoiceModel } from '../domain/Invoice';
import { defaultBulkGet } from '../utils/BulkGet';
import { invoiceService } from '../services/InvoiceService';
import { MissingObjectError } from '../utils/Errors';
import { Error } from 'mongoose';
import { convertData as convertResponseData } from '../utils/ResponseConverters';
import { convertData as convertRequestData } from '../utils/RequestConverters';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import { MongoRepo } from '../../shared/MongoLib';
import { BaseLogger } from '../../shared/SGLogger';

export class InvoiceController {
    public async getManyInvoices(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        defaultBulkGet({ _teamId }, req, resp, next, InvoiceSchema, InvoiceModel, invoiceService);
    }

    public async getInvoice(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const invoice = await invoiceService.findInvoice(
                _teamId,
                new mongodb.ObjectId(req.params.invoiceId),
                <string>req.query.responseFields
            );

            if (!invoice) {
                return next(new MissingObjectError(`Invoice ${req.params.invoiceId} not found.`));
            } else {
                response.data = convertResponseData(InvoiceSchema, invoice);
                return next();
            }
        } catch (err) {
            // If req.params.invoiceId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Invoice ${req.params.invoiceId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async getInvoicePDF(req: Request, resp: Response, next: NextFunction): Promise<void> {
        try {
            const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
            const response: ResponseWrapper = (resp as any).body;
            const invoice = await invoiceService.findInvoicePDF(_teamId, new mongodb.ObjectId(req.params.invoiceId));

            response.data = convertResponseData(InvoiceSchema, invoice);
            return next();
        } catch (err) {
            // If req.params.invoiceId wasn't a mongo id then we will get a CastError - basically same as if the id wasn't found
            if (err instanceof Error.CastError) {
                return next(new MissingObjectError(`Invoice ${req.params.invoiceId} not found.`));
            } else {
                return next(err);
            }
        }
    }

    public async createInvoice(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const newInvoice = await invoiceService.createInvoice(
                _teamId,
                convertRequestData(InvoiceSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );
            if (newInvoice == null) {
                response.data = '';
                response.statusCode = ResponseCode.OK;
            } else {
                response.data = convertResponseData(InvoiceSchema, newInvoice);
                response.statusCode = ResponseCode.CREATED;
            }
            return next();
        } catch (err) {
            return next(err);
        }
    }

    public async updateInvoice(req: Request, resp: Response, next: NextFunction): Promise<void> {
        const _teamId: mongodb.ObjectId = new mongodb.ObjectId(<string>req.headers._teamid);
        const response: ResponseWrapper = resp['body'];
        try {
            const updatedInvoice: any = await invoiceService.updateInvoice(
                _teamId,
                new mongodb.ObjectId(req.params.invoiceId),
                convertRequestData(InvoiceSchema, req.body),
                req.header('correlationId'),
                <string>req.query.responseFields
            );

            if (_.isArray(updatedInvoice) && updatedInvoice.length === 0) {
                return next(new MissingObjectError(`Invoice ${req.params.invoiceId} not found.`));
            } else {
                response.data = convertResponseData(InvoiceSchema, updatedInvoice);
                response.statusCode = ResponseCode.OK;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
}

export const invoiceController = new InvoiceController();
