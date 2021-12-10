import { MutationTree } from 'vuex';
import { JobCoreState, Job, JobFetchType } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<JobCoreState> = {  
  addModels(state: JobCoreState, models: Job[]){
    coreMutations.addModels(state, models);
  },

  select(state: JobCoreState, model: Job){
    coreMutations.select(state, model);
  },

  update(state: JobCoreState, model: Job){
    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: JobCoreState, updated: Job){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: JobCoreState, model: Job) {    
    coreMutations.delete(state, model);
  },

  updateJobFetchType(state: JobCoreState, jobFetchType: JobFetchType){
    state.selectedJobFetchType = jobFetchType;
    localStorage.setItem('jobMonitor_jobFetchType', ''+state.selectedJobFetchType);
  }
};