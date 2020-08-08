import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { Task } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
    getByJobId: (state) => {
        return (jobId: string) => {
            return lodash.filter(state.models, (model: Task) => {return model._jobId === jobId; } );
        }
    }
};
