import { ActionTree } from 'vuex';
import { actions as coreActions } from '@/store/core/actions';
import { CoreState, RootState, Model, StoreType } from '@/store/types';
import { Job } from './types';
import { Task } from '@/store/task/types';
import { Step } from '@/store/step/types';
export const actions: ActionTree<CoreState, RootState> = {  
  
  save({commit, state}, model?: Job) : Promise<Model> {
    return coreActions.save({commit, state}, model);
  },

  fetchModel({commit, state}, id: string): Promise<Model>{
    return coreActions.fetchModel({commit, state}, {id});
  },

  fetchModels({commit, state}, {ids, preCommit}:{ids: string[], preCommit?: Function}): Promise<Model[]>{
    return coreActions.fetchModels({commit, state}, {ids, preCommit});
  },

  fetchModelsByFilter({commit, state}, {filter, preCommit}: {filter?: string, preCommit?: Function} = {}): Promise<Model[]>{
    return coreActions.fetchModelsByFilter({commit, state}, {filter, preCommit});
  },

  delete({commit, state}, model?: Job): Promise<void> {
    return coreActions.delete({commit, state}, model);
  },

  async select({commit, state, dispatch}, model: Job): Promise<Model|undefined> {
    const selectPromise = coreActions.select({commit, state}, model);

    // When a jobdef is selected automatically load it's taskDefs and when 
    // the taskDefs are loaded fetch the stepDefs associated with those tasks
    selectPromise.then(async () => {
      if(state.selected){
        const tasks: Task[] = await dispatch(`${StoreType.TaskStore}/fetchModelsByFilter`, {filter: `_jobId==${state.selected.id}`}, {root: true});
        if(tasks.length > 0){
          // load the task outcomes
          const taskIds = JSON.stringify(tasks.map((task: Task) => task.id));
          dispatch(`${StoreType.TaskOutcomeStore}/fetchModelsByFilter`, {filter: `_taskId->${taskIds}`}, {root: true});
          
          // load the steps
          const steps: Step[] = await dispatch(`${StoreType.StepStore}/fetchModelsByFilter`, {filter: `_taskId->${taskIds}`}, {root: true});
        
          // load the step outcomes
          const stepIds = JSON.stringify(steps.map((step: Step) => step.id));
          dispatch(`${StoreType.StepOutcomeStore}/fetchModelsByFilter`, {filter: `_stepId->${stepIds}`}, {root: true});
        }
      }
    });

    return selectPromise;
  },

  updateSelectedCopy({commit, state}, updated: Model): Promise<Model|undefined> {
    return coreActions.updateSelectedCopy({commit, state}, updated);
  }
  
};