import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { PaymentTransaction } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
  getByInvoiceId: (state) => {
    return (invoiceId: string) => {
      return lodash.filter(state.models, (model: PaymentTransaction) => {return model._invoiceId === invoiceId; } );
    }
  }
};