import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { Agent } from './types';

export const getters: GetterTree<CoreState, RootState> = {
  getAgentsBySelectedOrg: (state: any, getters: any, rootState: any) => {
    const selectedOrgId = rootState['orgStore'].selected ? rootState['orgStore'].selected.id : null;
    return state.models.filter((agent: Agent) => agent._orgId === selectedOrgId);
  }
};
