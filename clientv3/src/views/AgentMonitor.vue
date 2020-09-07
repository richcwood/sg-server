<template>
  <div class="main" style="margin-left: 12px; margin-right: 12px;">

    <!-- Modals -->
    <modal name="import-cron-modal" :width="800" :height="600">
      <div class="round-popup" style="margin: 12px; width: 100%; height: 100%">
        <div>
          These cron entries were extracted from your agent's machine.
          <br> You can import them into Saas Glue as Jobs.
        </div>

        <table class="table" style="margin-top: 12px; margin-left: 8px;">
          <tr class="tr">
            <td class="td">
              Cron Job
            </td>
            <td class="td"></td>
            </tr>
          <tr class="tr" v-for="(rawCronJob, index) in rawCronJobs" v-bind:key="rawCronJob">
            <td class="td">
              {{rawCronJob}}
            </td>
            <td class="td">
              <button class="button" @click="onImportRawCronClicked(index)">Import</button>
            </td>
          </tr>
          <tr class="tr">
            <td class="td" colspan="3">
              <button class="button" @click="onCloseImportCronClicked">Close</button>
            </td>
          </tr>
        </table>
      </div>
    </modal>






    <div v-if="agents.length === 0">
      There are no agents created yet.  
      <br>Create a Job in the Designer and download / some agents to see them here.
    </div>
    <Split v-else style="height: 1000px;" direction="vertical">
      <SplitArea :size="35">
        <table class="table">
          <tr class="tr">
            <td class="td" colspan="8">
              <span style="position: relative;">
                <input class="input" type="text" style="padding-left: 30px; width: 450px;" v-model="filterString" placeholder="Filter by Agent Name, Tags and IP Address">
                <font-awesome-icon icon="search" style="position: absolute; left: 10px; top: 10px; color: #dbdbdb;" />
              </span>
            </td>
          </tr>
          <tr class="tr">
            <th class="th"></th>
            <th class="th">Name</th>
            <th class="th">Status</th>
            <th class="th">IP Address</th>
            <th class="th">Tags</th>
            <th class="th">Track Stats</th>
            <th class="th">Last Heartbeat</th>
            <th class="th">Import Cron</th>
          </tr>
          <tr class="tr" v-for="agent in filteredAgents" v-bind:key="agent.id">
            <td class="td"><input type="checkbox" v-model="agent._isSelectedInMonitor"></td>
            <td class="td">{{agent.name}}</td>
            <td class="td">
              <span class="activeAgent" v-if="isAgentActive(agent)">Active</span>
              <span v-else>Inactive</span>
            </td>
            <td class="td">{{agent.ipAddress}}</td>
            <td class="td"><span v-html="mapToString(agent.tags, 2)"></span></td>
            <td class="td" style="text-align: center; padding: 10px">
              <input type="checkbox" v-bind:value="isChecked(agent.propertyOverrides.trackSysInfo)" @change="ontrackSysInfoChanged(agent)" :checked="isChecked(agent.propertyOverrides.trackSysInfo)">
            </td>
            <td class="td">{{momentToStringV1(agent.lastHeartbeatTime)}}</td>
            <td class="td"><button class="button" :disabled="!agent.cron" @click="onImportCronClicked(agent)">Import</button></td>
          </tr>
        </table>
      </SplitArea>
      <SplitArea :size="65">
        <div>
          <tabs>
            <tab title="Settings">
              <table class="table" style="width: 450px;">
                <tr class="tr">
                  <td class="td">
                    Max Active Tasks
                  </td>
                  <td class="td">
                    <input class="input" type="text" style="width: 200px;" v-model="selectedMaxActiveTasks" :disabled="selectedAgents.length === 0"/>
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td">
                    Handle General Tasks
                  </td>
                  <td class="td">
                    <input type="checkbox" v-model="selectedHandleGeneralTasks" :disabled="selectedAgents.length === 0"/>
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td">
                    Inactive Agent Task
                  </td>
                  <td class="td">
                    <input class="input" type="text" style="width: 200px;" v-model="selectedInactiveAgentTasks" :disabled="selectedAgents.length === 0"/>
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td">
                  </td>
                  <td class="td">
                    <button class="button is-primary" @click="onSaveSettingsClicked" :disabled="selectedAgents.length === 0">Save</button>
                    <button class="button" style="margin-left: 12px;" @click="onCancelSettingsClicked" :disabled="selectedAgents.length === 0">Cancel</button>
                  </td>
                </tr>
              </table>
            </tab>
            <tab title="System Information">
              System information for the selected agent (nothing if multiple agents selected)
              <pre>{{((selectedAgent && selectedAgent.sysInfo) ? selectedAgent.sysInfo : '')}}</pre>
            </tab>
            <tab title="Tags">
              <br>
              <div v-if="selectedAgents.length === 0">
                No agents selected
              </div>
              <table v-else class="table">
                <tr class="tr" v-if="selectedAgentTags.length === 0">
                  <td class="td" colspan="2">
                    No common tags for selected agents
                  </td>
                </tr>
                <tr class="tr" v-for="tag in selectedAgentTags" v-bind:key="tag">
                  <td class="td">{{tag}}</td>
                  <td class="td"><a @click.prevent="onDeleteTagClicked(tag)">Delete</a></td>
                </tr>
                <tr class="tr"><td class="td" colspan="2"></td></tr>
                <tr class="tr">
                  <td class="td">
                    <input class="input" type="text" style="width: 125px;" v-model="newTagKey" placeholder="key"/>
                    <span style="font-weight: 700; margin-left: 4px; margin-right: 4px;">=</span>
                    <input class="input" type="text" style="width: 125px;" v-model="newTagValue" placeholder="value"/>
                  </td>
                  <td class="td">
                    <button class="button" @click="onAddTagClicked">Add tag to selected agents</button>
                  </td>
                </tr>
              </table>
            </tab>
          </tabs>
        </div>
      </SplitArea>
    </Split>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel } from '@/decorator';
import { StoreType } from '@/store/types';
import { Agent } from '../store/agent/types';
import VueSplit from 'vue-split-panel';
import { Tabs, Tab } from 'vue-slim-tabs';
import axios from 'axios';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { momentToStringV1 } from '@/utils/DateTime';
import _ from 'lodash';
import moment from 'moment';
import { focusElement, stringToMap, mapToString } from '@/utils/Shared';
import { JobDef } from '@/store/jobDef/types';
import { showErrors } from '@/utils/ErrorHandler';

enum UpdateTagType {
  ADD, DELETE
};

@Component({
  components: { Tabs, Tab },
  props: { },
})
export default class AgentMonitor extends Vue {
  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly mapToString = mapToString;

  @BindStoreModel({storeType: StoreType.TeamStore})
  private selectedTeam : any;

  private lastCountForSort = 0;

  private filterString = '';

  private mounted(){
    // restore last filters if possible
    if(localStorage.getItem('agentMonitor_filterString')){
      this.filterString = localStorage.getItem('agentMonitor_filterString');
    }
  }

  private beforeDestroy(){
    // save current filters
    localStorage.setItem('agentMonitor_filterString', this.filterString);
  }

  private get agents(): Agent[] {
    // Agent load was already triggered when the app started (security/actions/startApp)
    const agents = this.$store.getters[`${StoreType.AgentStore}/getAgentsBySelectedTeam`];
     
    if(this.lastCountForSort !== agents.length){
      this.lastCountForSort = agents.length;
      agents.sort((agentA: Agent, agentB: Agent) => {
        return (new Date(agentB.lastHeartbeatTime)).getTime() - (new Date(agentA.lastHeartbeatTime)).getTime();
      });
    }

    return agents;
  }

  private get filteredAgents(): Agent[] {
    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase.split(' ').map(item => item.trim()).filter(item => item);
    return this.agents.filter((agent: Agent) => {
      if(filterUCaseItems.length === 0){
        return true;
      }
      else {
        return filterUCaseItems.some((filter: string) => {
          if(agent.name.toUpperCase().indexOf(filter) !== -1){
            return true;
          } 
          else if(agent.ipAddress.indexOf(filter) !== -1){
            return true;
          }
          else if(Object.keys(agent.tags).some((tagKey: string) => tagKey.toUpperCase().indexOf(filter) !== -1)){
            return true;
          }
          else if(Object.values(agent.tags).some((tagValue: string) => tagValue.toUpperCase().indexOf(filter) !== -1)){
            return true;
          }
          else {
            return false;
          }
        });
      }
    });
  }

  @Watch('filterString')
  private onFilterStringChanged(){
    // Whenever the filter text changes, just be safe and clear any existing selections
    // because it's dangerous to continue selecting something that is no longer visible
    // just make it consistent and clear all selections rather than being fancy and clearing out
    // existing selections that are no longer visible
    for(let agent of this.agents){
      this.$store.commit(`${StoreType.AgentStore}/update`, {id: agent.id, _isSelectedInMonitor: false});
    }
  }

  private get selectedAgents(): Agent[] {
    return this.agents.filter((agent: Agent) => agent._isSelectedInMonitor);
  }

  private selectedAgentCopies: {[agentId: string] : Agent} = {};

  private get selectedAgent(): Agent|null {
    if(this.selectedAgents.length === 1){
      return this.selectedAgents[0];
    }
    else {
      return null;
    }
  }

  @Watch('selectedAgents')
  private onSelectedAgentsChanged(){
    // Need to update the copies used for mutations
    const newCopies = _.clone(this.selectedAgentCopies); // shallow clone - references
    
    // Remove copies no longer selected
    for(const agentId of Object.keys(newCopies)){
      if(!this.selectedAgents.find((agent: Agent) => agent.id === agentId)){
        delete newCopies[agentId];
      }
    }

    // Add new copies
    for(const agent of this.selectedAgents){
      if(!newCopies[agent.id]){
        newCopies[agent.id] = _.cloneDeep(agent);
      }
    }

    // Need to do this to make the object reactive / change
    this.selectedAgentCopies = newCopies;
  }

  // Whenever you save agents, you need to recreate the copies to be reactive
  // only call this after saving the agents in the API
  private refreshSelectedAgentCopies(){
    const updatedSelectedAgentCopies = {};
    for(const agent of this.selectedAgents){
      updatedSelectedAgentCopies[agent.id] = _.cloneDeep(agent);
    }

    this.selectedAgentCopies = updatedSelectedAgentCopies;
  }

  private isChecked(val: any) {
    return val == true;
  }

  private ontrackSysInfoChanged(agent: any){
    const properties = {
      trackSysInfo: !agent.propertyOverrides.trackSysInfo
    };
    this.$store.dispatch(`${StoreType.AgentStore}/saveSettings`, {id: agent.id, properties})
  }

  private removeItemFromArray(array: any[], item: any) {
    const index = array.indexOf(item);
    if (index > -1)
        array.splice(index, 1);
  }

  // Helper to get all of the selected tasks property override values if they are homogenous
  private getSelectedAgentsSharedPropertyOverride(key: string): string|null {
    const selectedAgentIds = Object.keys(this.selectedAgentCopies);

    if(selectedAgentIds.length > 0){
      const firstValue = this.selectedAgentCopies[selectedAgentIds[0]].propertyOverrides[key];
    
      if( selectedAgentIds.map((agentId: string) => {
            return this.selectedAgentCopies[agentId].propertyOverrides[key];
          }).every((val: string) => val === firstValue)){
        return firstValue;
      }
      else {
        return '<>'; // they don't all match
      }
    }
    else {
      return null;
    }
  }

  private getSelectedAgentsSharedPropertyOverride_boolean(key: string): boolean {
    const value = this.getSelectedAgentsSharedPropertyOverride(key);
    return value === '<>' ? false : <boolean><unknown>value;
  }

  private setSelectedAgentsSharedPropertyOverride(key: string, value: string){
    const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    for(const selectedAgentId of selectedAgentIds){
      this.selectedAgentCopies[selectedAgentId].propertyOverrides[key] = value;
    }
  }

  private get selectedMaxActiveTasks(): string {
    return this.getSelectedAgentsSharedPropertyOverride('maxActiveTasks');
  }

  private set selectedMaxActiveTasks(newValue: string) {
    this.setSelectedAgentsSharedPropertyOverride('maxActiveTasks', newValue);
  }

  private get selectedHandleGeneralTasks(): boolean {
    return this.getSelectedAgentsSharedPropertyOverride_boolean('handleGeneralTasks');
  }

  private set selectedHandleGeneralTasks(newValue: boolean) {
    this.setSelectedAgentsSharedPropertyOverride('handleGeneralTasks', <string><unknown>newValue);
  }

  private get selectedInactiveAgentTasks(): string {
    return this.getSelectedAgentsSharedPropertyOverride('inactiveAgentTask');
  }

  private set selectedInactiveAgentTasks(newValue: string) {
    this.setSelectedAgentsSharedPropertyOverride('inactiveAgentTask', newValue);
  }

  // The set of tags shared across all selected agents - tag must exist for all agents
  private get selectedAgentTags(): string[] {
    const selectedAgentTags: string[][] = [];

    const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    for(let agentId of selectedAgentIds){
      const tags = this.selectedAgentCopies[agentId].tags;
      const tagKeyValues: string[] = [];
      for(let tagKey of Object.keys(tags)){
        tagKeyValues.push(`${tagKey}=${tags[tagKey]}`);
      }

      selectedAgentTags.push(tagKeyValues);
    }

    return _.intersection(...selectedAgentTags);
  }

  private async onSaveSettingsClicked(){
    try {
      const savePromises = [];

      const selectedAgentIds = Object.keys(this.selectedAgentCopies);
      for(const selectedAgentId of selectedAgentIds){
        const selectedAgent = this.selectedAgentCopies[selectedAgentId];
        const properties = {
          maxActiveTasks: selectedAgent.propertyOverrides.maxActiveTasks,
          handleGeneralTasks: selectedAgent.propertyOverrides.handleGeneralTasks,
          inactiveAgentTask: selectedAgent.propertyOverrides.inactiveAgentTask
        };

        savePromises.push(this.$store.dispatch(`${StoreType.AgentStore}/saveSettings`, {id: selectedAgentId, properties}));
      }
      await Promise.all(savePromises);
      this.refreshSelectedAgentCopies();

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Saved agent settings.', AlertPlacement.FOOTER, AlertCategory.INFO));
    }
    catch(err) {
      console.error(err);
      showErrors('Error saving agent settings.', err);
    }
  }

  private onCancelSettingsClicked(){
    // Need to update the copies used for mutations
    const newCopies = {};

    // Add new fresh copies
    for(const agent of this.selectedAgents){
      newCopies[agent.id] = _.cloneDeep(this.selectedAgents[agent.id]);
    }

    // Need to do this to make the object reactive / change
    this.selectedAgentCopies = newCopies;
  }

  private newTagKey = '';
  private newTagValue = '';

  private async onAddTagClicked(){
    if (this.newTagKey.trim() && this.newTagValue.trim()){
      this.updateSelectedAgentTags(UpdateTagType.ADD, this.newTagKey, this.newTagValue);
    }
  }

  private onDeleteTagClicked(tag: string) {
    // the tag should be in key=value format because it will come from the template above
    this.updateSelectedAgentTags(UpdateTagType.DELETE, tag.split('=')[0]);
  }

  private async updateSelectedAgentTags(updateType: UpdateTagType, tagKey: string, tagValue?: string){
    try {
      const agentIds = Object.keys(this.selectedAgentCopies);
      const savePromises: Promise<any>[] = [];

      for(let agentId of agentIds){
        const agentCopy: Agent = this.selectedAgentCopies[agentId];
        
        if(updateType === UpdateTagType.ADD){  
          agentCopy.tags[tagKey] = tagValue;
          savePromises.push(this.$store.dispatch('agentStore/saveTags', {id: agentId, tags: agentCopy.tags}));
        }
        else {
          if(agentCopy.tags[tagKey]){
            delete agentCopy.tags[tagKey];
            savePromises.push(this.$store.dispatch('agentStore/saveTags', {id: agentId, tags: agentCopy.tags}));
          }
          else {
            console.error('Tried to remove a tag that did not exist on agent', tagKey, agentCopy.name);
          }
        }
      }

      await Promise.all(savePromises);
      this.refreshSelectedAgentCopies();

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert('Saved agent tags.', AlertPlacement.FOOTER, AlertCategory.INFO));
      
      if(updateType === UpdateTagType.ADD){
        this.newTagKey = this.newTagValue = '';
      }
    }
    catch(err) {
      console.error(err);
      showErrors('Error saving agent tags.', err);
    }
  }

  private isAgentActive(agent: Agent){
    if(agent.lastHeartbeatTime){
      const now = moment();

      try {
        return !agent.offline && now.diff(moment(agent.lastHeartbeatTime), 'seconds') < 180;
      }
      catch(err){
        console.log('Could not convert last heartbeat to a moment', err);
        return false;
      }
    }
    else {
      return false;
    }
  }

  private selectedAgentForCronImport: Agent|null = null;
  private rawCronJobs = [];

  private onImportCronClicked(agent: Agent){
    if(agent.cron){
      // Split and show non-empty rows
      this.selectedAgentForCronImport = agent;
      this.rawCronJobs = agent.cron.split('\n').filter(entry => entry.trim());
      this.$modal.show('import-cron-modal');
    }
  }

  private async onImportRawCronClicked(index: number){
    try {
      const rawCronJob = this.rawCronJobs[index];
      
      const {data: {data}} = await axios.post('/api/v0/jobdef/cron', {
        cronString: rawCronJob, 
        _agentId: this.selectedAgentForCronImport.id
      });

      // Result will be the newly created jobDef
      const jobDef = <JobDef> data;

      window.open(`${window.location.origin}/#/jobDesigner/${jobDef.id}`);

      const alertMessage = `Cron Job imported to a new Saas Glue Job "${jobDef.name}".<br><br>Remember to remove this cron job from the Agent machine "${this.selectedAgentForCronImport.name}"<br>`;
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(alertMessage, AlertPlacement.WINDOW, AlertCategory.INFO));      
    }
    catch(err) {
      console.error(err);
      showErrors('Error importing the cron job.', err);
    }
  }

  private onCloseImportCronClicked(){
    this.$modal.hide('import-cron-modal');
  }
}
</script>

<style src="vue-slim-tabs/themes/default.css"></style>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

  table {
    border-width: 0;
  }

  td {
    border-width: 0 !important;
  }

  select {
    margin-left: 8px;
    margin-right: 8px;
  }

  .activeAgent {
    color: green;
  }

  table, th, td {
    border-collapse: collapse;
  }
  th, td {
    padding: 10px;
  }
  th {
    text-align: left;
  }

  ul {
     list-style: none;
     padding-left: .25rem;
  }
</style>
