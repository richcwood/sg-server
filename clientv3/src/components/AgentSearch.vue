<template>
  <span class="auto-complete">
    <span style="position: relative;">
      <input :disabled="disabled" 
             class="control input search-input" 
             :class="{activeAgent: agent && isAgentActive(agent)}"
             style="padding-left: 30px;" 
             @focus="onSearchInputFocus" 
             @blur="onSearchInputBlur" 
             @keydown="onSearchKeyDown" 
             v-model="search" 
             placeholder="Agent name">
      <font-awesome-icon icon="search" style="position: absolute; left: 20px; top: 10px; color: #dbdbdb;" />
    </span>
    <div class="search-choices" v-if="choices.length > 0">
      <div class="search-choice" v-for="choice in choices" v-bind:key="choice.id" @mousedown="onSearchOnMouseDown(choice)">
        <span :class="{activeAgent: isAgentActive(choice)}">{{choice.name}}</span>
      </div>
    </div>
  </span>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { Agent } from '@/store/agent/types';
import { LinkedModel, StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { isAgentActive } from '@/store/agent/agentUtils';

@Component
export default class AgentSearch extends Vue {

  // expose to template
  private readonly isAgentActive = isAgentActive;

  @Prop() private agentId!: string;

  @Prop() private disabled!: boolean;

  private finishedMounting = false;

  private search = '';
  private choices: Agent[] = [];

  private mounted(){
    this.onSearchKeyDown = _.debounce(this.onSearchKeyDown, 400);
    this.onSearchInputBlur();
    this.finishedMounting = true;
  }

  // A reactive map
  private loadedAgents = {};

  private get agent(): Agent|null {
    try {
      if(this.agentId && this.agentId.trim() && !this.agentId.trim().startsWith('2')){
        if(!this.loadedAgents[this.agentId]){
          Vue.set(this.loadedAgents, this.agentId, {name: 'loading...'});

          (async () => {
            this.loadedAgents[this.agentId] = await this.$store.dispatch(`${StoreType.AgentStore}/fetchModel`, this.agentId);
            this.search = this.loadedAgents[this.agentId].name;
          })();
        }
        else {
          this.search = this.loadedAgents[this.agentId].name;
        }

        return this.loadedAgents[this.agentId];
      }
      else if(this.agentId && this.agentId.trim()){
        return { name: this.agentId, id: this.agentId };
      }
      else {
        return null;
      }
    }
    catch(err){
      console.log('Error in agent search finding agent by id', this.agentId);
      return null;
    }
  }

  private async onSearchKeyDown(){
    try {
      if(this.search.trim().length > 0 && !this.search.trim().startsWith('@')){
        const agents = await this.$store.dispatch(`${StoreType.AgentStore}/fetchModelsByFilter`, {filter: `name~=${this.search}`});
        agents.sort((agentA: Agent, agentB: Agent) => agentA.name.localeCompare(agentB.name));
        if(agents.length > 8){
          agents.splice(8);
        }
        
        this.choices = agents;
      }
      else if(this.search.trim().length > 0 ){
        this.choices = [{ name: this.search.trim(), id: this.search.trim() }];
      }
    }
    catch(err){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error searching agents: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
    }
  }

  private onSearchOnMouseDown(agent: Agent){
    this.choices = [];
    this.search = agent.name;
    this.$emit('agentPicked', agent);
  }

  private onSearchInputFocus(){
    if(!this.search){
      this.onSearchKeyDown(); // Just perform a search to start
    }
  }

  private onSearchInputBlur(){
    this.choices = [];

    if(this.finishedMounting && !this.search){
      this.$emit('agentPicked');
    }

    if(this.agent && this.agent.name !== this.search){
      this.search = this.agent.name;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  .auto-complete {
    position: relative;
  }

  .search-input {
    margin-left: 10px;
    width: 250px;
  }

  .search-choices {
    position: absolute;
    top: 36px;
    left: 10px;
    right: 0;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    border-color: #dbdbdb;
    border-width: 1px;
    border-style: solid;
    z-index: 99;
  }

  .search-choice {
    background-color: white;
    border-radius: inherit;
    padding-left: 4px;
    font-size: $size-5;
  }

  .search-choice:hover {
    background-color: $white-ter;
    cursor: pointer;
  }

  .activeAgent {
    color: green;
  }
</style>
