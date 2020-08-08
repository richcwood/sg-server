import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { TaskDef } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
    getByJobDefId: (state) => {
        return (jobDefId: string) => {
            return lodash.filter(state.models, (taskDef: TaskDef) => {
                return taskDef._jobDefId === jobDefId; 
            }).sort((taskA: TaskDef, taskB: TaskDef) => {
                return taskB.order - taskA.order;
            });
        }
    }
};
