<template>
  <div>
    <div>
      <input type="checkbox" v-model="isUsingSGG">
      Select agent by @SGG dynamic variable

      <!-- <font-awesome-icon icon="question-circle" class="popup-help-question" v-tooltip="'You have ' + 4 + ' new messages.'"/> -->

      <v-popover class="help-popover">
        <font-awesome-icon icon="question-circle" class="popup-help-question"/>
        <span slot="popover">
          <div>
            You can select an agent by it's name or you can dynamically
            <br>select an agent by an @SGG (<b>S</b>aas <b>G</b>lue <b>G</b>lobal) variable.
            <br>
            <br>
            @SGG variables can be define as 
              <ul>
                <li>Team Vars via the  <router-link :to="{name: 'teamVars'}"> team var tab </router-link></li>
                <li>Job runtime variables via a Job's Runtime Variables settings<li>
                <li>Scripts that dyanmically output @SGG variables in your script's standard output</li>
              </ul>
          </div>
        </span>
      </v-popover>

    </div>
    <input v-if="isUsingSGG" class="control input" :style="{width: width}" placeholder="Enter @SGG variable here" ref="sggTextInput" v-model="sggValue">
    <span v-else class="auto-complete">
      <span style="position: relative;">
        <input :disabled="disabled" 
              class="control input search-input" 
              :class="{activeAgent: agent && isAgentActive(agent)}"
              style="padding-left: 30px;" 
              :style="{width: width}"
              @focus="onSearchInputFocus" 
              @blur="onSearchInputBlur" 
              @keydown="onSearchKeyDown" 
              v-model="search" 
              placeholder="Agent name">
          <font-awesome-icon v-if="waitingOnAgentSearch" icon="ellipsis-h" style="position: absolute; left: 10px; top: 10px; color: black;" />
          <font-awesome-icon v-else icon="search" style="position: absolute; left: 10px; top: 10px; color: #dbdbdb;" />
      </span>
      <div class="search-choices" v-if="choices.length > 0">
        <div class="search-choice" v-for="choice in choices" v-bind:key="choice.id" @mousedown="onSearchOnMouseDown(choice)">
          <span :class="{activeAgent: isAgentActive(choice)}">{{choice.name}}</span>
        </div>
      </div>
    </span>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Agent } from '../store/agent/types';
import { StoreType } from '../store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import { isAgentActive } from '../store/agent/agentUtils';
import { VPopover } from 'v-tooltip';

@Component({
  components: { VPopover }
})
export default class AgentSearch extends Vue {

  // expose to template
  private readonly isAgentActive = isAgentActive;

  @Prop() private agentId!: string;

  @Prop() private disabled!: boolean;

  @Prop({default: '250px'}) private width!: string;

  private finishedMounting = false;

  private search = '';
  private choices: any[] = [];

  private mounted(){
    this.onSearchKeyDown = _.debounce(this.onSearchKeyDown, 400);
    this.onSearchInputBlur();
    this.finishedMounting = true;
  }

  // A reactive map
  private loadedAgents = {};

  private get agent(): any|null {
    try {
      if(this.agentId && !this.agentId.trim().toUpperCase().startsWith('@SGG')){
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

  private waitingOnAgentSearch = false;

  private async onSearchKeyDown(keyboardEvent?: KeyboardEvent){
    try {
      this.waitingOnAgentSearch = true;

      const agents = await this.$store.dispatch(`${StoreType.AgentStore}/fetchModelsByFilter`, {filter: `name~=${this.search}`});
      
      // active agents first, then sort by agent name
      agents.sort((agentA: Agent, agentB: Agent) => {
        const isAActive = isAgentActive(agentA);
        const isBActive = isAgentActive(agentB);

        if(isAActive !== isBActive){
          if(isAgentActive(agentA)){
            return -1; // a wins.  Don't worry - b will get it's day in the soon next compare
          }
          else {
            return 1; // b wins and will swap with a
          }
        }
        else {
          // both are either active or not
          return agentA.name.localeCompare(agentB.name);
        }
      });
      
      if(agents.length > 5){
        agents.splice(5);
      }

      this.choices = agents;
    }
    catch(err){
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Error searching agents: ${err}`, AlertPlacement.WINDOW, AlertCategory.ERROR));
    }
    finally {
      this.waitingOnAgentSearch = false;
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
    else if(this.agent && this.agent.name !== this.search){
      this.search = this.agent.name;
    }
  }

  private get isUsingSGG(){
    return this.agentId && this.agentId.toUpperCase().startsWith('@SGG');
  }

  private set isUsingSGG(val: boolean){
    if(val === true){
      this.$emit('agentPicked', {id: '@SGG("sgg_variable_name_here")'});

      // Highlight the search text for input
      setTimeout(() => {
        const sggTextInput = (<any>this.$refs).sggTextInput;
        sggTextInput.focus();
        sggTextInput.setSelectionRange(0, 22);
      }, 100);
    }
    else {
      this.search = ''; // clear out the search
      this.$emit('agentPicked');
      this.onSearchKeyDown(); // kick off blank search
    }
  }

  private readonly SGG_REGEX = /^@[Ss]{1,1}[Gg]{1,1}[Gg]{1,1}\(\"([^"]+)\"\)/;

  private get sggValue(){
    if(this.isUsingSGG){
      const match = this.agentId.match(this.SGG_REGEX);

      if(match){
        return match[1];
      }
    }

    return '';
  }

  private set sggValue(val: string){
    this.$emit('agentPicked', {id: `@SGG("${val}")`});
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  .auto-complete {
    position: relative;
  }

  .search-input {
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

  // todo - make into reusable component
  .popup-help-question {
    color: #dbdbdbe5;
  }

  li {
    margin-left: 10px;
  }

  li:first-letter {
    font-weight: 700;
  }
</style>
