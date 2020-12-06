import { Model } from '@/store/types'

export enum InvoiceStatus { CREATED = 0, SUBMITTED = 1, PAID = 2, REJECTED = 3 };

export interface Invoice extends Model {
  id?: string;
  _teamId: string;
  
  startDate: Date;
  endDate: Date;
  dueDate?: Date;
  scriptRate: number;
  numScripts: number;
  jobStoragePerMBRate: number;
  storageMB: number;
  artifactsDownloadedPerMBRate: number;
  artifactsDownloadedMB: number;
  newAgentRate: number;
  numNewAgents: number;
  billAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  pdfLocation: string;
  note?: { date: Date, by: string, note: string };
  url?: string;
};