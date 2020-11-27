<template>
  <div>

    <!-- Modals -->
    <modal name="add-artifact-modal" :classes="'round-popup'" :width="700" :height="700">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td">Add Artifact(s)</td>
          </tr>
          <tr class="tr">
            <td class="td">
              <artifact-search id="artifactsearch-modal-autofocus" @artifactsPicked="onArtifactsPicked"></artifact-search>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button class="button is-primary" style="margin-left: 10px;" :disabled="artifactSearchSelectedArtifactIds.length === 0" @click="addArtifacts">Add Artifact(s)</button> 
              <button class="button button-spaced" @click="cancelAddArtifact">Cancel</button>
            </td>
          </tr>
        </tbody> 
      </table>
    </modal>




    <div v-if="taskDef">
      <validation-observer ref="editTaskDefValidationObserver">
        <table class="table">
          <tr class="tr">
            <td class="td">
              <label class="label">Task Name</label>
            </td>
            <td class="td">
              <validation-provider name="Task Name" rules="required|object-name" v-slot="{ errors }">
                <input class="input" v-model="taskDef.name">
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
            <td class="td">
            </td>
          </tr>

          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              Run on single agent
            </td>
            <td class="td">
              <span style="margin-left:40px;">Run on multiple agents</span>
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <input type="radio" class="radio" v-model="taskDef.target" :value="TaskDefTarget.SINGLE_SPECIFIC_AGENT"/> This agent
            </td>
            <td class="td">
              <input type="radio" class="radio" style="margin-left: 40px;" v-model="taskDef.target" :value="TaskDefTarget.ALL_AGENTS_WITH_TAGS"/> Active agents with tags
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <agent-search :agentId="taskDef.targetAgentId"  @agentPicked="onTargetAgentPicked" :disabled="taskDef.target !== TaskDefTarget.SINGLE_SPECIFIC_AGENT"></agent-search>
            </td>
            <td class="td">
              <validation-provider name="Target Tags" rules="variable-map" v-slot="{ errors }">
                <input type="text" class="input" style="margin-left: 60px;" v-model="taskDef_requiredTags_string" :disabled="taskDef.target !== TaskDefTarget.ALL_AGENTS_WITH_TAGS"/> 
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger" style="margin-left: 60px;">{{ errors[0] }}</div>
              </validation-provider>
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <input type="radio" class="radio" v-model="taskDef.target" :value="TaskDefTarget.SINGLE_AGENT_WITH_TAGS"/> An agent with tags
            </td>
            <td class="td">
              <input type="radio" class="radio" style="margin-left: 40px;" v-model="taskDef.target" :value="TaskDefTarget.ALL_AGENTS"/> All active agents
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <validation-provider name="Target Tags" rules="variable-map" v-slot="{ errors }">
                <input type="text" class="input" style="margin-left: 20px;" v-model="taskDef_requiredTags_string" :disabled="taskDef.target !== TaskDefTarget.SINGLE_AGENT_WITH_TAGS"/> 
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger" style="margin-left: 20px;">{{ errors[0] }}</div>
              </validation-provider>
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <input type="radio" class="radio" v-model="taskDef.target" :value="TaskDefTarget.SINGLE_AGENT"/> Any active agent
            </td>
          </tr>

          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <input type="checkbox" 
                v-model="taskDef.autoRestart" 
                :disabled="taskDef.target === TaskDefTarget.ALL_AGENTS || taskDef.target === TaskDefTarget.ALL_AGENTS_WITH_TAGS">
              Auto restart
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button is-primary" :disabled="!hasTaskDefChanged" @click="onSaveTaskDefClicked">Save</button>
              <button class="button button-spaced" :disabled="!hasTaskDefChanged" @click="cancelTaskDefChanges">Cancel</button>
            </td>
            <td class="td"></td>
          </tr>
        </table>

        <div style="display: flex;">
          <div style="margin-left: 25px;">
            <div>
              Task steps
            </div>
            <div class="select is-multiple">
              <select multiple size="8" style="width: 350px; height:200px; margin-bottom: 10px;" v-model="selectedStepDefsForOrder">
                <option v-for="stepDef in stepDefs" v-bind:key="stepDef.id" :value="stepDef">{{`${stepDef.name}`}}</option>
              </select>
            </div>
            <div>
              <button class="button" @click="createNewStepDef">Create Step</button>
              <button class="button button-spaced" :disabled="!selectedStepDefForOrder" @click="onDeleteStepDefClicked">Delete</button>
              <button class="button button-spaced" :disabled="!selectedStepDefForOrder" @click="onEditStepDefClicked">Edit</button>
              <p style="margin-top: 5px;"></p>
              <button class="button" :disabled="!selectedStepDefForOrder || isSelectedStepDefFirst()" @click="onMoveStepDefUpClicked">Move Up</button>
              <button class="button button-spaced" :disabled="!selectedStepDefForOrder || isSelectedStepDefLast()" @click="onMoveStepDefDownClicked">Move Down</button>
            </div>
          </div>

          <div style="margin-left: 35px;">
            <div>
              Task artifacts
            </div>
            <div class="select is-multiple">
              <select multiple size="8" style="width: 350px; height: 200px; margin-bottom: 10px;" v-model="selectedArtifactIds">
                <option v-for="artifactId in taskDef.artifacts" v-bind:key="artifactId" :value="artifactId">{{getArtifact(artifactId).prefix}} {{getArtifact(artifactId).name}}</option>
              </select>
            </div>
            <div>
              <button class="button" @click="onAddArtifactClicked">Add Artifact(s)</button>
              <button class="button button-spaced" @click="onRemoveArtifactClicked" :disabled="selectedArtifactIds.length === 0" >Remove Artifact(s)</button>
            </div>
          </div>
        </div>

      </validation-observer>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { showErrors } from '@/utils/ErrorHandler'; 
import { TaskDef, TaskDefTarget } from '../store/taskDef/types';
import { StepDef } from '../store/stepDef/types';
import { Artifact } from '../store/artifact/types';
import { BindStoreModel, BindSelected, BindSelectedCopy, BindProp } from '@/decorator';
import axios from 'axios';
import { focusElement, stringToMap, mapToString } from '@/utils/Shared';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import AgentSearch from '@/components/AgentSearch.vue';
import ArtifactSearch from '@/components/ArtifactSearch.vue';

@Component({
  components: {
    ValidationProvider, ValidationObserver, AgentSearch, ArtifactSearch
  }
})
export default class TaskDefEditor extends Vue {

  // Expose to template
  private readonly TaskDefTarget = TaskDefTarget;
  
  @BindSelectedCopy({storeType: StoreType.TaskDefStore})
  private taskDef!: null|TaskDef;

  private onTargetAgentPicked(agent: any){
    if(agent){
      this.taskDef.targetAgentId = agent.id;
    }
    else {
      this.taskDef.targetAgentId = null;
    }
  }

  private get hasTaskDefChanged(){
    return this.$store.state[StoreType.TaskDefStore].storeUtils.hasSelectedCopyChanged();
  }

  private taskDef_requiredTags_string = '';

  @Watch('taskDef')
  private onTaskDefChanged(){
    if(this.taskDef){
      this.taskDef_requiredTags_string = mapToString(this.taskDef.requiredTags);
    }
    else {
      this.taskDef_requiredTags_string = '';
    }
  }

  @Watch('taskDef_requiredTags_string')
  private onTaskDef_requiredTags_stringChanged(){
    try {
      this.taskDef.requiredTags = stringToMap(this.taskDef_requiredTags_string);
    }
    catch(err){ } // eat it - validator already gave warning
  }

  // Sadly bulma won't let me define a pretty multiselect and but enforce the user to only make a single selection (html can)
  private selectedStepDefsForOrder: StepDef[] = [];
  private selectedStepDefForOrder: null|StepDef = null;

  @Watch('selectedStepDefsForOrder')
  private onselectedStepDefsForOrderChanged(){
    if(this.selectedStepDefsForOrder.length === 1){
      this.selectedStepDefForOrder = this.selectedStepDefsForOrder[0];
    }
    else {
      this.selectedStepDefForOrder = null;
    }
  }

  private onDeleteStepDefClicked(){
    if(this.selectedStepDefForOrder){
      const stepDefToDelete = this.selectedStepDefForOrder;
      this.selectedStepDefsForOrder = [];
      this.$emit('deleteStepDef', stepDefToDelete);
    }
  }

  private onEditStepDefClicked(){
    if(this.selectedStepDefForOrder){
      this.$emit('editStepDef', this.selectedStepDefForOrder);
    }
  }

  private isSelectedStepDefFirst(){ 
    return    this.selectedStepDefForOrder
           && this.stepDefs[0] === this.selectedStepDefForOrder;
  }

  private isSelectedStepDefLast(){
    const lastStepDefIndex = this.stepDefs.length - 1;
    return    this.selectedStepDefForOrder
           && this.stepDefs[lastStepDefIndex] === this.selectedStepDefForOrder;
  }

  // based on selectedItemForNav being a taskDef
  private get stepDefs(){
    if(this.taskDef){
      return this.stepDefsForTaskDef(this.taskDef);
    }
    else {
      return [];
    }
  }

  private stepDefsForTaskDef(taskDef: TaskDef): StepDef[] {
    return this.$store.getters[`${StoreType.StepDefStore}/getByTaskDefId`](taskDef.id);
  }

  private async onMoveStepDefUpClicked(){
    if(this.selectedStepDefForOrder && ! this.isSelectedStepDefFirst()){
      this.updateStepDefOrder(this.selectedStepDefForOrder, this.selectedStepDefForOrder.order - 1);
    }
  }

  private onMoveStepDefDownClicked(){
    if(this.selectedStepDefForOrder && ! this.isSelectedStepDefLast()){
      this.updateStepDefOrder(this.selectedStepDefForOrder, this.selectedStepDefForOrder.order + 1);
    }
  }

  private async updateStepDefOrder(stepDef: StepDef, newOrder: number){
    // Mutate a temp object, real object persisted to the store on successful save
    const tempStepDef = {id: stepDef.id, order: newOrder};

    try {
      await this.$store.dispatch(`${StoreType.StepDefStore}/save`, tempStepDef);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Updated step order`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors('Error updating step', err);
    }
  }

  private async onSaveTaskDefClicked(){
    try {
      if(this.taskDef){
        if( ! await (<any>this.$refs.editTaskDefValidationObserver).validate()){
          return;
        }

        if(    this.taskDef.target === TaskDefTarget.ALL_AGENTS 
            || this.taskDef.target === TaskDefTarget.ALL_AGENTS_WITH_TAGS){
          this.taskDef.autoRestart = false; // clear out this choice
        }

        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving task - ${this.taskDef.name}`, AlertPlacement.FOOTER));      
        await this.$store.dispatch(`${StoreType.TaskDefStore}/save`);
      }
    }
    catch(err){
      console.error(err);
      showErrors('Error saving task', err);
    }
  }

  private cancelTaskDefChanges(){
    // Just reselect the original job def
    this.$store.dispatch(`${StoreType.TaskDefStore}/select`, this.$store.state[StoreType.TaskDefStore].selected);
  }

  private createNewStepDef(){
    this.$emit('createNewStepDef');
  }

  // for reactivity in a template
  private loadedArtifacts = {};
  private getArtifact(artifactId: string): Artifact {
    try {
      if(!this.loadedArtifacts[artifactId]){
        Vue.set(this.loadedArtifacts, artifactId, {name: 'loading...'});

        (async () => {
          this.loadedArtifacts[artifactId] = await this.$store.dispatch(`${StoreType.ArtifactStore}/fetchModel`, artifactId);
        })();
      }

      return this.loadedArtifacts[artifactId];
    }
    catch(err){
      console.log('Error in loading an artifact.  Maybe it was deleted?', artifactId);
      return {
        prefix: 'Error',
        name: 'Error',
        _teamId: 'Error',
        s3Path: 'Error'
      }
    }
  }

  private onAddArtifactClicked(){
    this.$modal.show('add-artifact-modal');
  }

  private cancelAddArtifact(){
    this.$modal.hide('add-artifact-modal');
  }

  private artifactSearchSelectedArtifactIds: string[] = [];
  private onArtifactsPicked(artifactIds: string[]){
    this.artifactSearchSelectedArtifactIds = artifactIds;
  }

  private async addArtifacts(){
    if(this.taskDef){
      try {
        const newArtifactIds: string[] = _.clone(this.taskDef.artifacts);
        let addedArtifacts = false;

        for(let selectedArtifactId of this.artifactSearchSelectedArtifactIds){
          if(newArtifactIds.indexOf(selectedArtifactId) === -1){
            newArtifactIds.push(selectedArtifactId);
            addedArtifacts = true;
          }
        }
        
        if(addedArtifacts){
          const newTask = {
            id: this.taskDef.id,
            artifacts: newArtifactIds
          };

          await this.$store.dispatch(`${StoreType.TaskDefStore}/save`, newTask);
          this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saved task with the artifact`, AlertPlacement.FOOTER));
        }
      }
      catch(err){
        console.error(err);
        showErrors('Error saving the artifact in the task', err);
      }
      finally {
        this.$modal.hide('add-artifact-modal');
      }
    }
  }

  private selectedArtifactIds: string[] = [];

  private async onRemoveArtifactClicked(){
    if(this.taskDef && this.selectedArtifactIds.length > 0){
      try {
        const newArtifactIds = _.clone(this.taskDef.artifacts);
        let removedArtifacts = false;

        for(let selectedArtifactId of this.selectedArtifactIds){
          const selectedArtifactIndex = newArtifactIds.indexOf(selectedArtifactId);
          if(selectedArtifactIndex !== -1){
            newArtifactIds.splice(selectedArtifactIndex, 1);
            removedArtifacts = true;
          }
        }
        
        if(removedArtifacts){
          const newTask = {
            id: this.taskDef.id,
            artifacts: newArtifactIds
          };

          await this.$store.dispatch(`${StoreType.TaskDefStore}/save`, newTask);
          this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saved task with the artifact`, AlertPlacement.FOOTER));
        }
      }
      catch(err){
        console.error(err);
        showErrors('Error removing the artifact(s) from the task', err);
      }
    }
  }
}


</script>

<style scoped lang="scss">
table {
  border-width: 0;
}

td {
  border-width: 0 !important;
}

.button-spaced {
  margin-left: 10px;
}

</style>
