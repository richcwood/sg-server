import { convertData } from '../utils/ResponseConverters';
import { InvoiceSchema, InvoiceModel } from '../domain/Invoice';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { S3Access } from '../../shared/S3Access';
import { InvoiceStatus } from '../../shared/Enums';
import * as mongodb from 'mongodb';
import * as _ from 'lodash';
import * as config from 'config';


export class InvoiceService {

    public async findAllInvoicesInternal(filter?: any, responseFields?: string) {
        return InvoiceModel.find(filter).select(responseFields);
    }


    public async findAllInvoices(_teamId: mongodb.ObjectId, responseFields?: string) {
        return InvoiceModel.find({ _teamId }).select(responseFields);
    }


    public async findInvoice(_teamId: mongodb.ObjectId, invoiceId: mongodb.ObjectId, responseFields?: string): Promise<InvoiceSchema|null> {
        const result: InvoiceSchema[] = await InvoiceModel.findById(invoiceId).find({ _teamId }).select(responseFields);
        if (_.isArray(result) && result.length > 0)
            return result[0];
        return null;
    }


    public async findInvoicePDF(_teamId: mongodb.ObjectId, id: mongodb.ObjectId) {
        const invoiceQuery = await InvoiceModel.findById(id).find({ _teamId }).select('pdfLocation');
        if (!invoiceQuery || (_.isArray(invoiceQuery) && invoiceQuery.length === 0))
            throw new MissingObjectError(`No invoice with id "${id.toHexString()}"`);
        const invoice: InvoiceSchema = invoiceQuery[0];

        let s3Access = new S3Access();
        let url = await s3Access.getSignedS3URL(invoice.pdfLocation, config.get('S3_BUCKET_INVOICES'));

        return { id: invoice._id, url };
    }


    public async createInvoiceInternal(data: any): Promise<object> {
        const model = new InvoiceModel(data);
        await model.save();
        return;
    }


    public async createInvoice(_teamId: mongodb.ObjectId, data: any, correlationId: string, responseFields?: string): Promise<object> {
        data._teamId = _teamId;
        const invoiceModel = new InvoiceModel(data);
        const newInvoice = await invoiceModel.save();

        await rabbitMQPublisher.publish(_teamId, "Invoice", correlationId, PayloadOperation.CREATE, convertData(InvoiceSchema, newInvoice));

        if (responseFields) {
            // It's is a bit wasteful to do another query but I can't chain a save with a select
            return this.findInvoice(_teamId, newInvoice.id, responseFields);
        }
        else {
            return newInvoice; // fully populated model
        }
    }


    public async updateInvoice(_teamId: mongodb.ObjectId, id: mongodb.ObjectId, data: any, correlationId?: string, responseFields?: string): Promise<object> {
        if ('_teamId' in data)
            throw new ValidationError('Unable to update _teamId field');
        if ('startDate' in data)
            throw new ValidationError('Unable to update startDate field');
        if ('endDate' in data)
            throw new ValidationError('Unable to update endDate field');
        if ('numScripts' in data)
            throw new ValidationError('Unable to update numScripts field');

        let updatedInvoice = undefined;
        if ('notes' in data) {
            const clonedNotes = _.clone(data.notes);
            delete data.notes;
            for (let note of clonedNotes) {
                updatedInvoice = await InvoiceModel.findOneAndUpdate({ _id: id, _teamId }, { $push: { notes: note } }, { new: true });
            }
        }

        if (Object.keys(data).length > 0) {
            const invoice: InvoiceSchema = await this.findInvoice(_teamId, id, 'status')
            if (invoice.status == InvoiceStatus.PAID)
                throw new ValidationError(`Error updating invoice "${id}" - invoice has status ${invoice.status}`);

            updatedInvoice = await InvoiceModel.findOneAndUpdate({ _id: id, _teamId }, data, { new: true }).select(responseFields);

            // let billAmount = 0.0;
            // let scriptAmount = data.scriptRate * data.numScripts;
            // let newAgentAmount = data.newAgentRate * data.numNewAgents;
            // let artifactsAmount = data.artifactsDownloadedPerGBRate * data.artifactsDownloadedMB;
            // if (scriptAmount)
            //     billAmount += scriptAmount;
            // if (newAgentAmount)
            //     billAmount += newAgentAmount;
            // if (artifactsAmount)
            //     billAmount += artifactsAmount;
            // if (billAmount != updatedInvoice.billAmount) {
            //     updatedInvoice = await InvoiceModel.findOneAndUpdate({ _id: id, _teamId }, { billAmount: billAmount }, { new: true }).select(responseFields);
            //     data.billAmount = updatedInvoice.billAmount;
            // }
        }

        if (!updatedInvoice)
            throw new MissingObjectError(`Invoice with id '${id}' not found.`)

        let deltas = Object.assign({ _id: id }, data);
        let convertedDeltas = convertData(InvoiceSchema, deltas);
        await rabbitMQPublisher.publish(_teamId, "Invoice", correlationId, PayloadOperation.UPDATE, convertedDeltas);

        return updatedInvoice; // fully populated model
    }
}

export const invoiceService = new InvoiceService();