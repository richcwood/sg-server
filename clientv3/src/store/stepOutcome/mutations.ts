import { MutationTree } from 'vuex';
import { CoreState } from '@/store/types';
import { StepOutcome } from './types';

// You can't invoke mutations from other mutations via Vuex but you can directly invoke them
import {mutations as coreMutations} from '@/store/core/mutations';

export const mutations: MutationTree<CoreState> = {  
  addModels(state: CoreState, models: StepOutcome[]){
    // only triggered when we save a script in API or get a stream api message
    // the API saves code in base64 so we need to decode it
    for(let stepOutcome of models){
      if(stepOutcome.runCode){
        try {
          stepOutcome.runCode = atob(stepOutcome.runCode);
        }
        catch(err){
          // too much data to convert in db right now - can remove once script.code is converted to base64
          console.log(`Failed to base64 decode the taskOutcome.runCode ${stepOutcome.name}. Trying to parse it as json`);
          stepOutcome.runCode = JSON.parse(stepOutcome.runCode);
        }
      }
    }

    coreMutations.addModels(state, models);
  },

  select(state: CoreState, model: StepOutcome){
    coreMutations.select(state, model);
  },

  update(state: CoreState, model: StepOutcome){
    // only triggered when we save a script in API or get a stream api message
    // the API saves code in base64 so we need to decode it
    if(model.runCode){
      try {
        model.runCode = atob(model.runCode);
      }
      catch(err){
        // too much data to convert in db right now - can remove once script.code is converted to base64
        console.log(`Failed to base64 decode the taskOutcome.runCode ${model.name}. Trying to parse it as json`);
        model.runCode = JSON.parse(model.runCode);
      }
    }

    coreMutations.update(state, model);
  },

  updateSelectedCopy(state: CoreState, updated: StepOutcome){    
    coreMutations.updateSelectedCopy(state, updated);
  },

  delete(state: CoreState, model: StepOutcome) {    
    coreMutations.delete(state, model);
  }
};