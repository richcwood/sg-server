import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { ScriptShadow } from './types';
import lodash from 'lodash';

export const getters: GetterTree<CoreState, RootState> = {
  getByScriptIdAndUserId: (state) => {
    return (scriptId: string, userId: string) => {
        return lodash.find(state.models, (model: ScriptShadow) => {
          return model._scriptId === scriptId && model._userId === userId; 
        });
    }
  }
};