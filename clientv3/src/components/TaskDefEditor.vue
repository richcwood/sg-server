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

    <div class="tabs-container-item" v-if="taskDef">
      <validation-observer ref="editTaskDefValidationObserver">
        <table class="table mt-4" style="background-color: inherit;">
          <tr class="tr">
            <td class="td">
              <label class="label">Task Name</label>
            </td>
            <td class="td">
              <validation-provider name="Task Name" rules="required|object-name" v-slot="{ errors }">
                <input class="input" style="width: 350px;" v-model="taskDef.name">
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
            <td class="td">
            </td>
          </tr>

          <tr class="tr">
            <td class="td">
              <label class="label" style="width: 150px;">Target Agent(s)</label>
            </td>
            <td class="td">
              <div class="select is-info">
                <select v-model="taskDef.target">
                  <option v-for="(targetIndex, targetName) in TargetAgentChoices" :key="`target-choice-${targetIndex}`" :value="targetIndex">
                    {{targetName}}
                  </option>
                </select>
              </div>
            </td>
          </tr>

          <tr class="tr" v-if="taskDef.target === TaskDefTarget.SINGLE_SPECIFIC_AGENT">
            <td class="td">
              <label class="label" style="width: 150px;">Target Agent</label>
            </td>
            <td class="td">
              <agent-search :agentId="taskDef.targetAgentId" :width="'350px'" @agentPicked="onTargetAgentPicked"></agent-search>
            </td>
          </tr>

          <tr class="tr" v-if="taskDef.target === TaskDefTarget.ALL_AGENTS_WITH_TAGS || taskDef.target === TaskDefTarget.SINGLE_AGENT_WITH_TAGS">
            <td class="td">
              <label class="label" style="width: 150px;">Target Agent Tags</label>
            </td>
            <td class="td">
              <validation-provider name="Target Tags" rules="variable-map" v-slot="{ errors }">
                <input type="text" class="input" v-model="taskDef_requiredTags_string"/> 
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
          </tr>

          <tr class="tr">
            <td class="td">
              <label class="label" style="width: 150px;">Auto Restart</label>
            </td>
            <td class="td">
              <input type="checkbox" 
                v-model="taskDef.autoRestart" 
                :disabled="taskDef.target === TaskDefTarget.ALL_AGENTS || taskDef.target === TaskDefTarget.ALL_AGENTS_WITH_TAGS">
            </td>
          </tr>

          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button is-primary" :disabled="!hasTaskDefChanged" @click="onSaveTaskDefClicked">Save</button>
              <button class="button button-spaced" :disabled="!hasTaskDefChanged" @click="cancelTaskDefChanges">Cancel</button>
            </td>
          </tr>

          <tr class="tr">
            <td class="td" colspan="2">
              <span style="margin-top: 15px;"> </span>
            </td>
          </tr>

          <tr class="tr">
            <td class="td">
              <label class="label" style="width: 150px;">Steps</label>
            </td>
            <td class="td">
              <div class="select is-multiple">
                <select multiple size="8" style="width: 350px; height:200px; margin-bottom: 10px;" v-model="selectedStepDefsForOrder">
                  <option v-for="stepDef in stepDefs" v-bind:key="stepDef.id" :value="stepDef">{{`${stepDef.name}`}}</option>
                </select>
              </div>
              <div>
                <button class="button" style="width: 120px;" :disabled="!selectedStepDefForOrder || isSelectedStepDefFirst()" @click="onMoveStepDefUpClicked">Move Up</button>
                <button class="button button-spaced" style="width: 120px;" :disabled="!selectedStepDefForOrder || isSelectedStepDefLast()" @click="onMoveStepDefDownClicked">Move Down</button>
              </div>
              <div style="margin-top: 10px;">
                <button class="button" style="width: 120px;" @click="createNewStepDef">Create Step</button>
                <button class="button button-spaced"  style="width: 120px;" :disabled="!selectedStepDefForOrder" @click="onDeleteStepDefClicked">Delete</button>
                <button class="button button-spaced" :disabled="!selectedStepDefForOrder" @click="onEditStepDefClicked">Edit</button>
              </div>
            </td>
          </tr>

          <tr class="tr">
            <td class="td" colspan="2">
              <span style="margin-top: 15px;"> </span>
            </td>
          </tr>

          <tr class="tr">
            <td class="td">
              <label class="label" style="width: 150px;">Artifacts</label>
            </td>
            <td class="td">
              <div class="select is-multiple">
                <select multiple size="8" style="width: 350px; height: 200px; margin-bottom: 10px;" v-model="selectedArtifactIds">
                  <option v-for="artifactId in taskDef.artifacts" v-bind:key="artifactId" :value="artifactId">{{getArtifact(artifactId).prefix}} {{getArtifact(artifactId).name}}</option>
                </select>
              </div>
              <div>
                <IsFreeTier>
                  <template #yes>
                    <button class="button" title="Artifacts upload is not available on a Free tier." disabled>Add Artifact(s)</button>
                  </template>
                  <template #no>
                    <button class="button" @click="onAddArtifactClicked">Add Artifact(s)</button>
                  </template>
                </IsFreeTier>
                <button class="button button-spaced" @click="onRemoveArtifactClicked" :disabled="selectedArtifactIds.length === 0" >Remove Artifact(s)</button>
              </div>
            </td>
          </tr>
        </table>
      </validation-observer>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Vue, Watch } from 'vue-property-decorator';
import { StoreType } from '../store/types';
import { SgAlert, AlertPlacement } from '../store/alert/types';
import { showErrors } from '../utils/ErrorHandler'; 
import { TaskDef, TaskDefTarget } from '../store/taskDef/types';
import { StepDef } from '../store/stepDef/types';
import { Artifact } from '../store/artifact/types';
import { BindSelectedCopy } from '../decorator';
import { tagsStringToMap, tagsMapToString } from '../utils/Shared';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import AgentSearch from './AgentSearch.vue';
import ArtifactSearch from '../components/ArtifactSearch.vue';
import IsFreeTier from '@/components/IsFreeTier.vue';

@Component({
  components: {
    ValidationProvider, ValidationObserver, AgentSearch, ArtifactSearch, IsFreeTier,
  }
})
export default class TaskDefEditor extends Vue {

  // Expose to template
  private readonly TaskDefTarget = TaskDefTarget;
  private readonly TargetAgentChoices = {
    'Any Available Agent': TaskDefTarget.SINGLE_AGENT,
    'A Specific Agent': TaskDefTarget.SINGLE_SPECIFIC_AGENT,
    'A Single Agent With Tags': TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
    'All Active Agents': TaskDefTarget.ALL_AGENTS,
    'All Active Agents With Tags': TaskDefTarget.ALL_AGENTS_WITH_TAGS
  };
  
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

  @Watch('taskDef', {immediate: true})
  private onTaskDefChanged(){
    if(this.taskDef){
      this.taskDef_requiredTags_string = tagsMapToString(this.taskDef.requiredTags);
    }
    else {
      this.taskDef_requiredTags_string = '';
    }
  }

  @Watch('taskDef_requiredTags_string')
  private onTaskDef_requiredTags_stringChanged(){
    try {
      this.taskDef.requiredTags = tagsStringToMap(this.taskDef_requiredTags_string);
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

.tabs-container-item {
  border: 1px solid lightgray;
  border-bottom: none;
  background-color: var(--grey-bg-color);
  height: 100vh;
}

</style>
