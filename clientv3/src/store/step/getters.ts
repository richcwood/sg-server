import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { Step } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
    getByTaskId: (state) => {
        return (taskId: string) => {
            return lodash.filter(state.models, (model: Step) => {return model._taskId === taskId; } );
        }
    }
};
