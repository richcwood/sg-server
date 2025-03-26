import { CoreState, RootState } from '../types';
import { GetterTree } from 'vuex';
import { Agent } from './types';

export const getters: GetterTree<CoreState, RootState> = {
  getAgentsBySelectedTeam: (state: any, getters: any, rootState: any) => {
    const selectedTeamId = rootState['teamStore'].selected ? rootState['teamStore'].selected.id : null;
    return state.models.filter((agent: Agent) => agent._teamId === selectedTeamId);
  }
};
