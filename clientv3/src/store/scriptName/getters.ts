import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { ScriptName } from './types';
import _ from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
  searchByName: (state) => {
    return (searchName: string) => {
      searchName = searchName.toUpperCase();
      return _.filter(state.models, (model: ScriptName) => {
        return model.name.toUpperCase().indexOf(searchName) !== -1; 
      });
    }
  }
};
