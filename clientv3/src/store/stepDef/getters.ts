import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { StepDef } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
    getByTaskDefId: (state) => {
        return (taskDefId: string) => {
            return lodash.filter(state.models, (model: StepDef) => {return model._taskDefId === taskDefId; } )
                         .sort( (stepDef1: any, stepDef2: any) => {return stepDef1.order - stepDef2.order;});
        }
    }
};