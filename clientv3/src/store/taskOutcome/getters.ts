import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { TaskOutcome } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
    getByTaskId: (state) => {
        return (taskId: string) => {
            return lodash.filter(state.models, (model: TaskOutcome) => {return model._taskId === taskId; } );
        }
    },

    getByJobId: (state) => {
        return (jobId: string) => {
            return lodash.filter(state.models, (model: TaskOutcome) => {return model._jobId === jobId; } );
        }
    }
};
