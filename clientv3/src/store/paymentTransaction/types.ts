import { Model } from '@/store/types'

export enum PaymentTransactionSource {BRAINTREE = 0};
export enum PaymentTransactionType {CHARGE = 0};
export enum PaymentTransactionStatus {APPROVED = 0, REJECTED = 1, SETTLED = 2, DISPUTED = 3, RESOLVED = 4};

export interface PaymentTransaction extends Model {
  _teamId: string;
  _invoiceId: string;
  source: PaymentTransactionSource;
  processorTransactionId: string;
  createdAt: Date;
  paymentInstrument: string;
  paymentInstrumentType: string;
  transactionType: string;
  status: PaymentTransactionStatus;
  amount: number;
}