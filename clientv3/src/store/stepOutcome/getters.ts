import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { StepOutcome } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
    getByTaskOutcomeId: (state) => {
        return (taskOutcomeId: string) => {
            return lodash.filter(state.models, (model: StepOutcome) => {return model._taskOutcomeId === taskOutcomeId; } );
        }
    }
};