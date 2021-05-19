<template>
  <div>

    <!-- modals -->
    <modal name="add-artifact-modal" :classes="'round-popup'" :width="700" :height="700">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td">Select Artifact</td>
          </tr>
          <tr class="tr">
            <td class="td">
              <artifact-search id="artifactsearch-modal-autofocus" :allowMultiple="false" @artifactsPicked="onArtifactPicked"></artifact-search>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button class="button is-primary" style="margin-left: 10px;" :disabled="!selectedArtifactId" @click="selectArtifact">Select Artifact</button> 
              <button class="button button-spaced" @click="cancelSelectArtifact">Cancel</button>
            </td>
          </tr>
        </tbody> 
      </table>
    </modal>




    <validation-observer ref="editTaskDefValidationObserver">
      <table class="table">
        <tr class="tr">
          <td class="td">
            <label class="label">SGC Task Name</label>
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

        <!-- AWS Lambda -->
        <template v-if="stepDefCopy && taskDef.target === TaskDefTarget.AWS_LAMBDA">
          
          <tr class="tr">
            <td class="td">
              <label class="label">Lamba Runtime</label>
            </td>
            <td class="td">
              <div class="select">
                <validation-provider name="Lambda Runtime" rules="required" v-slot="{ errors }">
                  <select v-model="stepDefCopy.lambdaRuntime" style="width: 250px;">
                    <option v-for="runtime in LambaRuntimes" :key="runtime" :value="runtime">
                      {{runtime}}
                    </option>
                  </select>
                  
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                </validation-provider>
              </div>
              <span style="margin-left: 10px; margin-top: 10px; color: red;" 
                    v-if="stepDefCopy.lambdaCodeSource === 'script' && selectedScript && ! doesLambdaRuntimeMatchScriptType()">
                Runtime doesn't match script type "{{selectedScript && scriptTypesForMonaco[selectedScript.scriptType]}}"
              </span>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <label class="label">Lamba Memory Size</label>
            </td>
            <td class="td">
              <div class="select">
                <select v-model="stepDefCopy.lambdaMemorySize" style="width: 250px;">
                  <option v-for="memSize in LambdaMemorySizes" :key="memSize" :value="memSize">
                    {{memSize}} mb
                  </option>
                </select>
              </div>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <label class="label">Lambda Timeout (seconds)</label>
            </td>
            <td class="td">
              <validation-provider name="Lambda Timeout" rules="required|lambdaTimeout" v-slot="{ errors }">
                <input class="input" v-model="stepDefCopy.lambdaTimeout">
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
            <td class="td">
            </td>
          </tr>

          <tr class="tr" v-if="stepDefCopy.lambdaCodeSource === 'zipFile'">
            <td class="td">
              <label class="label">Lambda Function Handler</label>
            </td>
            <td class="td">
              <validation-provider name="Lambda Function Handler" rules="required|object-name" v-slot="{ errors }">
                <input class="input" v-model="stepDefCopy.lambdaFunctionHandler">
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
            <td class="td">
            </td>
          </tr>
          <tr class="tr" v-if="stepDefCopy.lambdaCodeSource === 'script'">
            <td class="td">
              <label class="label">Lambda Dependencies</label>
            </td>
            <td class="td">
              <input class="input" v-model="stepDefCopy.lambdaDependencies" placeholder="compression;axios">
            </td>
            <td class="td">
            </td>
          </tr>

          <tr class="tr"><td class="td" colspan="2">&nbsp;</td></tr>

          <tr class="tr">
            <td class="td" colspan="2">
              <input type="radio" class="radio" v-model="stepDefCopy.lambdaCodeSource" :value="'script'"/> Script
              &nbsp;&nbsp;&nbsp;&nbsp;
              <input type="radio" class="radio" v-model="stepDefCopy.lambdaCodeSource" :value="'zipFile'"/> Script Lambda Zip File
            </td>
          </tr>
          
          <template v-if="stepDefCopy.lambdaCodeSource === 'script'">
            <tr class="tr">
              <td class="td" colspan="2">
                <script-search-with-create :scriptId="stepDefCopy._scriptId" @scriptPicked="onScriptPicked"></script-search-with-create>
              </td>
            </tr>
          </template>

          <template v-else>
            <tr class="tr">
              <td class="td" colspan="2">
                <button class="button" @click="onSelectArtifactClicked" style="margin-bottom: 10px;">Select Artifact</button> 
                <input class="input" readonly type="text" v-model="selectedArtifactName">
              </td>
            </tr>
          </template>

        </template>

        <tr class="tr">
          <td class="td" colspan="2">
            <button class="button is-primary" :disabled="!hasTaskOrStepDefChanged" @click="onSaveTaskAndStepDefClicked">Save</button>
            <button class="button button-spaced" :disabled="!hasTaskOrStepDefChanged" @click="cancelTaskAndStepDefChanges">Cancel</button>
          </td>
        </tr>
      </table>

      <div v-if="stepDefCopy && stepDefCopy.lambdaCodeSource === 'script' && selectedScript && selectedJobDef">
        <script-editor :script="selectedScript" :jobDef="selectedJobDef"></script-editor>
      </div>

    </validation-observer>

  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Vue, Watch } from 'vue-property-decorator';
import { StoreType } from '../store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import { showErrors } from '../utils/ErrorHandler'; 
import { TaskDef, TaskDefTarget } from '../store/taskDef/types';
import { StepDef, LambaRuntimes, LambdaMemorySizes, getLambdaRuntimesForScriptType } from '../store/stepDef/types';
import { Script, scriptTypesForMonaco } from '../store/script/types';
import { Artifact } from '../store/artifact/types';
import { BindSelected, BindSelectedCopy } from '../decorator';
import ScriptSearchWithCreate from '../components/ScriptSearchWithCreate.vue';
import ArtifactSearch from '../components/ArtifactSearch.vue';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { JobDef } from '../store/jobDef/types';
import ScriptEditor from '../components/ScriptEditor.vue';

@Component({
  components: {
    ScriptSearchWithCreate, ScriptEditor, ArtifactSearch, ValidationProvider, ValidationObserver
  }
})
export default class SGCTaskDef extends Vue {

  // Expose to template
  private readonly TaskDefTarget = TaskDefTarget;
  private readonly LambaRuntimes = LambaRuntimes;
  private readonly LambdaMemorySizes = LambdaMemorySizes;
  private readonly scriptTypesForMonaco = scriptTypesForMonaco;

  private mounted(){
    this.onTaskDefChanged();
  }

  @BindSelectedCopy({storeType: StoreType.TaskDefStore})
  private taskDef!: null|TaskDef;

  private selectedJobDef: JobDef|null = null;

  @Watch('taskDef')
  private async onTaskDefChanged(){
    const stepDefs = this.$store.getters[`${StoreType.StepDefStore}/getByTaskDefId`](this.taskDef.id);

    if(stepDefs.length === 1){
      this.stepDef = stepDefs[0];
    
      this.selectedJobDef = await this.$store.dispatch(`${StoreType.TaskDefStore}/fetchModel`, this.stepDef._taskDefId);
    }
    else {
      console.warn('For some reason, your sgc task did not have a default step or it had more than 1');
      this.stepDef = null;
    }
  }

  private stepDef: null|StepDef = null;
  private stepDefCopy: null|StepDef = null;

  @Watch('stepDef')
  private onStepDefChanged(){
    this.stepDefCopy = _.cloneDeep(this.stepDef);
  }

  private get hasTaskOrStepDefChanged(){
    return    this.$store.state[StoreType.TaskDefStore].storeUtils.hasSelectedCopyChanged() 
           || (!_.isEqualWith(this.stepDef, this.stepDefCopy));
  }

  private async onSaveTaskAndStepDefClicked(){
    try {
      if(this.taskDef){
        if( ! await (<any>this.$refs.editTaskDefValidationObserver).validate()){
          return;
        }

        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saving task - ${this.taskDef.name}`, AlertPlacement.FOOTER));      
        
        if(this.$store.state[StoreType.TaskDefStore].storeUtils.hasSelectedCopyChanged()){
          await this.$store.dispatch(`${StoreType.TaskDefStore}/save`);
        }

        if(!_.isEqualWith(this.stepDef, this.stepDefCopy)){
          this.stepDef = await this.$store.dispatch(`${StoreType.StepDefStore}/save`, this.stepDefCopy);
        }
      }
    }
    catch(err){
      console.error(err);
      showErrors('Error saving task', err);
    }
  }

  private cancelTaskAndStepDefChanges(){
    // Just reselect the original job def
    this.$store.dispatch(`${StoreType.TaskDefStore}/select`, this.$store.state[StoreType.TaskDefStore].selected);
    this.stepDefCopy = _.cloneDeep(this.stepDef);
  }

  private onScriptPicked(script: Script){
    if(script){
      this.stepDefCopy._scriptId = script.id;
    }
    else {
      this.stepDefCopy._scriptId = null;
    }

    this.onStepDefCopyChanged();
  }

  private onSelectArtifactClicked(){
    this.selectedArtifactId = null;
    this.$modal.show('add-artifact-modal');
  }

  private selectedArtifactId: string|null = null;

  private onArtifactPicked(artifactId: string){
    this.selectedArtifactId = artifactId;
  }

  private selectArtifact(){
    this.$modal.hide('add-artifact-modal');

    if(this.selectedArtifactId){
      this.stepDefCopy.lambdaZipfile = this.selectedArtifactId;
    }
  }

  private cancelSelectArtifact(){
    this.$modal.hide('add-artifact-modal');
  }

  private get selectedArtifactName(){
    return    this.stepDefCopy 
           && this.stepDefCopy.lambdaZipfile 
           && this.getArtifact(this.stepDefCopy.lambdaZipfile).name;
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

  @BindSelected({storeType: StoreType.ScriptStore})
  private selectedScript!: null|Script;
  
  @Watch('stepDefCopy')
  private async onStepDefCopyChanged(){
    if(this.stepDefCopy && this.stepDefCopy._scriptId){
      this.selectedScript = await this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, this.stepDefCopy._scriptId);
    }
    else {
      this.selectedScript = null;
    }
  }

  private doesLambdaRuntimeMatchScriptType(){
    if(this.selectedScript && this.stepDefCopy && this.stepDefCopy.lambdaCodeSource === 'script' && this.stepDefCopy.lambdaRuntime){
      const runtimes = getLambdaRuntimesForScriptType(this.selectedScript.scriptType);
      return runtimes.indexOf(this.stepDefCopy.lambdaRuntime) !== -1;
    }
    else {
      return false;
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