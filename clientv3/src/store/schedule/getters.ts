import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { Schedule } from './types';
import _ from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
  getByJobDefId: (state) => {
    return (jobDefId: string) => {
      return _.filter(state.models, (model: Schedule) => {return model._jobDefId === jobDefId; } );
    }
  }
};
