import { Module } from 'vuex';
import { CoreState, RootState, StoreType, Model, ModelBaseUrlType } from '@/store/types';
import { actions } from './actions';
import { mutations } from './mutations';
import PromiseStore from '@/store/core/PromiseStore';
import StoreUtils from '@/store/core/StoreUtils';

export const state: CoreState = {
  models: [],
  selected: undefined,
  selectedCopy: undefined,
  _url: () => `api/v0/${ModelBaseUrlType.paymentMethod}`,
  _storeName: StoreType.PaymentMethodStore.toString(),
  _promiseStore: new PromiseStore()
};

state.storeUtils = new StoreUtils(state);

export const paymentMethodStore: Module<CoreState, RootState> = {
    namespaced: true,
    state,
    actions,
    mutations
};