import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { Invoice, InvoiceStatus } from './types';

export const getters: GetterTree<CoreState, RootState> = {
  getPaidInvoices: (state: any, getters: any, rootState: any) => {
    return state.models.filter((invoice: Invoice) => invoice.status === InvoiceStatus.PAID);
  },

  getUnPaidInvoices: (state: any, getters: any, rootState: any) => {
    return state.models.filter((invoice: Invoice) => invoice.status !== InvoiceStatus.PAID);
  }
};