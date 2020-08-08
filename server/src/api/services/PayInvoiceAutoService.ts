import { convertData } from '../utils/ResponseConverters';
import { BaseLogger } from '../../shared/KikiLogger';
import { PaymentTransactionSchema, PaymentTransactionModel } from '../domain/PaymentTransaction';
import { PaymentTransactionSource } from '../../shared/Enums';
import { paymentTransactionService } from './PaymentTransactionService';
import { rabbitMQPublisher, PayloadOperation } from '../utils/RabbitMQPublisher';
import { MissingObjectError, ValidationError } from '../utils/Errors';
import { InvoiceSchema } from '../domain/Invoice';
import { invoiceService } from './InvoiceService';
import { InvoiceStatus, OrgPaymentStatus } from '../../shared/Enums';
import { OrgSchema } from '../domain/Org';
import { PaymentTransactionStatus } from '../../shared/Enums';
import { KikiUtils } from '../../shared/KikiUtils';
import * as _ from 'lodash';
import * as config from 'config';
import { orgService } from './OrgService';
import * as mongodb from 'mongodb';
import * as braintree from 'braintree';


export class PayInvoiceAutoService {
    public async payInvoice(_orgId: mongodb.ObjectId, data: any, logger: BaseLogger, correlationId: string): Promise<object> {
        data._orgId = _orgId;

        if (!data._invoiceId)
            throw new ValidationError(`Request body missing "_invoiceId" parameter`);

        const org: any = await orgService.findOrg(_orgId, 'paymentStatus, billing_email');
        if (_.isArray(org) && org.length === 0)
            throw new MissingObjectError(`Org '${_orgId}' not found`);

        const getInvoice: InvoiceSchema[] = await invoiceService.findInvoice(_orgId, new mongodb.ObjectId(data._invoiceId), 'status billAmount paidAmount');
        if (_.isArray(getInvoice) && getInvoice.length === 0)
            throw new MissingObjectError(`Invoice '${data._invoiceId}' not found for org '${_orgId}'`);
        const invoice: InvoiceSchema = getInvoice[0];
        if (invoice.status == InvoiceStatus.SUBMITTED || invoice.status == InvoiceStatus.PAID)
            throw new ValidationError(`Error creating payment transaction - invoice '${data._invoiceId}' has status '${InvoiceStatus[invoice.status]}'`);

        const amount = invoice.billAmount - invoice.paidAmount;

        if (amount <= 0) {
            let updatedInvoice = await invoiceService.updateInvoice(_orgId, invoice._id, { status: InvoiceStatus.PAID }, correlationId);
            await KikiUtils.CreateAndSendInvoice(org, updatedInvoice, { paymentInstrumentType: 'n/a', paymentInstrument: 'n/a' }, logger);
            return { _orgId: _orgId, amount: 0 };
        }

        let merchantId = config.get('braintreeMerchantId');
        let publicKey = config.get('braintreePublicKey');
        let privateKey = config.get('braintreePrivateKey');

        let gateway = braintree.connect({
            environment: braintree.Environment.Sandbox,
            merchantId: merchantId,
            publicKey: publicKey,
            privateKey: privateKey
        });

        let transactionResponse = await gateway.transaction.sale({
            amount: amount,
            customerId: _orgId.toHexString(),
            options: {
                submitForSettlement: true
            },
            customFields: {
                invoice_id: invoice._id.toHexString()
            }
        });

        const transaction: any = transactionResponse.transaction;
        const paymentTransactionData = {
            _orgId: _orgId,
            _invoiceId: new mongodb.ObjectId(invoice._id),
            source: PaymentTransactionSource.BRAINTREE,
            processorTransactionId: transaction.id,
            createdAt: transaction.createdAt,
            paymentInstrument: transaction.creditCard.maskedNumber,
            paymentInstrumentType: transaction.paymentInstrumentType,
            transactionType: transaction.type,
            status: transaction.processorResponseText,
            amount: amount
        };
        const newPaymentTransaction: any = await paymentTransactionService.createPaymentTransaction(_orgId, paymentTransactionData, correlationId);
        await rabbitMQPublisher.publish(_orgId, "PaymentTransaction", correlationId, PayloadOperation.UPDATE, convertData(PaymentTransactionSchema, newPaymentTransaction));

        if (transactionResponse.success) {
            logger.LogInfo('Payment processing succeeded', transactionResponse);

            let updatedInvoice: any = await invoiceService.updateInvoice(_orgId, invoice._id, { paidAmount: invoice.paidAmount + amount, status: InvoiceStatus.PAID }, correlationId);
            await KikiUtils.CreateAndSendInvoice(org, updatedInvoice, paymentTransactionData, logger);

            if (org.paymentStatus == OrgPaymentStatus.DELINQUENT) {
                const getDelinquentInvoices: InvoiceSchema[] = await invoiceService.findAllInvoicesInternal({ _orgId, status: InvoiceStatus.REJECTED }, '_id');
                if (_.isArray(getDelinquentInvoices) && getDelinquentInvoices.length === 0)
                    await orgService.updateOrg(_orgId, { paymentStatus: OrgPaymentStatus.HEALTHY, paymentStatusDate: new Date() }, correlationId);
            }

            await rabbitMQPublisher.publish(_orgId, "Invoice", correlationId, PayloadOperation.UPDATE, convertData(InvoiceSchema, updatedInvoice));
        } else {
            logger.LogInfo('Payment processing failed', transactionResponse);
            const updatedInvoice: any = await invoiceService.updateInvoice(_orgId, invoice._id, { status: InvoiceStatus.REJECTED }, correlationId);
            await rabbitMQPublisher.publish(_orgId, "Invoice", correlationId, PayloadOperation.UPDATE, convertData(InvoiceSchema, updatedInvoice));

            if (org.paymentStatus == OrgPaymentStatus.HEALTHY) {
                const updatedOrg: any = await orgService.updateOrg(_orgId, { paymentStatus: OrgPaymentStatus.DELINQUENT, paymentStatusDate: new Date() }, correlationId);
                await rabbitMQPublisher.publish(_orgId, "Org", correlationId, PayloadOperation.UPDATE, convertData(OrgSchema, updatedOrg));
            }
        }

        return paymentTransactionData;
    }
}

export const payInvoiceAutoService = new PayInvoiceAutoService();