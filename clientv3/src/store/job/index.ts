import { Module } from 'vuex';
import { RootState, StoreType, Model, ModelBaseUrlType } from '@/store/types';
import { actions } from './actions';
import { mutations } from './mutations';
import { getters } from './getters';
import { JobCoreState, JobFetchType } from './types';
import PromiseStore from '@/store/core/PromiseStore';
import StoreUtils from '@/store/core/StoreUtils';

let selectedJobFetchType: JobFetchType;

if(localStorage.getItem('jobMonitor_jobFetchType')){
  selectedJobFetchType = Number.parseInt(localStorage.getItem('jobMonitor_jobFetchType'));
}
else {
  selectedJobFetchType = JobFetchType.TODAY;
}

export const state: JobCoreState = {
  models: [],
  selected: undefined,
  selectedCopy: undefined,
  _url: () => `api/v0/${ModelBaseUrlType.job}`,
  _storeName: StoreType.JobStore.toString(),
  _promiseStore: new PromiseStore(),
  selectedJobFetchType
};

state.storeUtils = new StoreUtils(state);

export const jobStore: Module<JobCoreState, RootState> = {
    namespaced: true,
    state,
    actions,
    mutations,
    getters
};