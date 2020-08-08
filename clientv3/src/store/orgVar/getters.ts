import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { OrgVar } from './types';

export const getters: GetterTree<CoreState, RootState> = {
  getAgentsBySelectedOrg: (state: any, getters: any, rootState: any) => {
    const selectedOrgId = rootState['orgStore'].selected ? rootState['orgStore'].selected.id : null;
    return state.models.filter((agent: OrgVar) => agent._orgId === selectedOrgId);
  }
};
