<template>
  <div class="main" style="margin-left: 12px; margin-right: 12px;">
    <!-- modals -->
    <modal name="pick-agents-modal" :classes="'round-popup'" :width="700" :height="700">
      <div style="background-color: white;">
        <validation-observer ref="runScriptValidationObserver">
          <tabs ref="runSettingsTabs" style="margin-top: 15px;">
           
            <tab title="Run on Agent(s)">
              <table class="table" width="100%" style="margin-top: 20px;">
                <tr class="tr">
                  <td class="td">
                    <label class="label" style="width: 150px;">Target Agent(s)</label>
                  </td>
                  <td class="td">
                    <select class="input" style="width: 350px;" v-model="runAgentTarget">
                      <option v-for="(targetIndex, targetName) in TargetAgentChoices" :key="`target-choice-${targetIndex}`" :value="targetIndex">
                        {{targetName}}
                      </option>
                    </select>
                  </td>
                </tr>  
                <tr class="tr" v-if="runAgentTarget === TaskDefTarget.SINGLE_SPECIFIC_AGENT">
                  <td class="td">
                    <label class="label" style="width: 150px;">Target Agent</label>
                  </td>
                  <td class="td">
                    <agent-search :width="'350px'" :agentId="runAgentTargetAgentId"  @agentPicked="onTargetAgentPicked" ></agent-search>
                  </td>
                </tr>
                <tr class="tr" v-if="runAgentTarget === TaskDefTarget.ALL_AGENTS_WITH_TAGS || runAgentTarget === TaskDefTarget.SINGLE_AGENT_WITH_TAGS">
                  <td class="td">
                    <label class="label" style="width: 150px;">Target Agent Tags</label>
                  </td>
                  <td class="td">
                    <validation-provider name="Target Tags" rules="variable-map" v-slot="{ errors }">
                      <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string"/> 
                      <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                    </validation-provider>
                  </td>
                </tr>
              </table>
            </tab>

            <tab title="Run on SGC (saas glue compute)">
              <table class="table" width="100%" style="margin-top: 20px;">
                <tr class="tr">
                  <td class="td">
                    <label class="label" style="width: 150px;">Lambda Runtime</label>
                  </td>
                  <td class="td">
                    <div class="select">
                      <validation-provider name="Lambda Runtime" rules="required" v-slot="{ errors }">
                        <select v-model="lambdaConfig.lambdaRuntime" style="width: 350px;">
                          <option v-for="runtime in LambaRuntimes" :key="runtime" :value="runtime">
                            {{runtime}}
                          </option>
                        </select>
                        <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                      </validation-provider>
                    </div>
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td">
                    <label class="label" style="width: 150px;">Lambda Memory Size</label>
                  </td>
                  <td class="td">
                    <div class="select" >
                      <select v-model="lambdaConfig.lambdaMemorySize" style="width: 350px;">
                        <option v-for="memSize in LambdaMemorySizes" :key="memSize" :value="memSize">
                          {{memSize}} mb
                        </option>
                      </select>
                    </div>
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td">
                    <label class="label" style="width: 150px;">Lambda Timeout (seconds)</label>
                  </td>
                  <td class="td">
                    <validation-provider name="Lambda Timeout" rules="required|lambdaTimeout" v-slot="{ errors }">
                      <input class="input" style="width: 350px;" v-model="lambdaConfig.lambdaTimeout">
                      <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                    </validation-provider>
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td">
                    <label class="label" style="width: 150px;">Lambda Dependencies</label>
                  </td>
                  <td class="td">
                    <input class="input" style="width: 350px;" v-model="lambdaConfig.lambdaDependencies" placeholder="compression;axios">
                  </td>
                </tr>
              </table>
            </tab>
          </tabs>


          <table class="table" width="100%" style="margin-top: 20px;">
            <tr class="tr">
              <td class="td">
                <label class="label" style="width: 150px;">Command</label>
              </td>
              <td class="td">
                <input class="input" style="width: 350px;" type="text" v-model="runScriptCommand"/>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="width: 150px;">Arguments</label>
              </td>
              <td class="td">
                <input class="input" style="width: 350px;" type="text" v-model="runScriptArguments"/>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="width: 150px;">Env Variables</label>
              </td>
              <td class="td">
                <validation-provider name="Env Vars" rules="variable-map" v-slot="{ errors }">
                  <input class="input" style="width: 350px;" type="text" v-model="runScriptEnvVars"/>
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="width: 150px;">Runtime Variables</label>
              </td>
              <td class="td">
                <validation-provider name="Runtime Vars" rules="variable-map" v-slot="{ errors }">
                  <input class="input" style="width: 350px;" type="text" v-model="runScriptRuntimeVars"/>
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="onRunScript">Run Script</button>
                <button class="button button-spaced" @click="onCancelRunScript">Cancel</button>
              </td>
            </tr>
          </table>

        </validation-observer>
      </div>
    </modal>




    <table class="table" style="width: 100%;">
      <tr class="tr">
        <td class="td" colspan="2">
          <script-search-with-create :width="'400px'" :scriptId="scriptId" @scriptPicked="onScriptPicked"></script-search-with-create>
        </td>
      </tr>
    </table>
    <table class="table">
      <tr class="tr">
        <td class="td">
          <label class="label">Original Author</label>
        </td>
        <td class="td">
          <div v-if="script">{{getUser(script._originalAuthorUserId).name}}</div>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label">Last Edited By</label>
        </td>
        <td class="td">
          <div v-if="script">{{getUser(script._lastEditedUserId).name}} on {{momentToStringV1(script.lastEditedDate)}}</div>
        </td>
      </tr>
      <tr class="tr">
        <td class="td">
          <label class="label">Team Members Can Edit</label>
        </td>
        <td class="td">
          <input type="checkbox" v-if="script" v-model="script.teamEditable" :disabled="script._originalAuthorUserId !== loggedInUserId" @change="onTeamEditableChanged(script)">

          <template v-if="script && script._originalAuthorUserId !== loggedInUserId">
            <span class="button-spaced" style="color:gray;">(orignal author: {{getUser(script._originalAuthorUserId).name}})</span>
          </template>
        </td>
      </tr>
    </table>

    <script-editor :script="scriptCopy"></script-editor>

    <table class="table" style="width: 100%;">
      <tr class="tr">
        <td class="td">
          <button class="button is-primary" @click="onRunScriptClicked" :disabled="!scriptCopy">Run Script</button>
          <button class="button button-spaced" @click="onScheduleScriptClicked" :disabled="!scriptCopy">Schedule Script</button>
        </td>
      </tr>
      
      <tr class="tr">
        <td class="td">
          <template v-if="runningJobs.length > 0">

            <template v-if="selectedJob">
              <span class="spaced">{{selectedJob.name}}</span>
              <button class="button button-spaced" :disabled="selectedJob.status!==JobStatus.RUNNING && selectedJob.status!==JobStatus.INTERRUPTED" @click="onCancelJobClicked">Cancel</button>              
              <span class="spaced">{{enumKeyToPretty(JobStatus, selectedJob.status)}}</span>
              <span class="spaced">{{momentToStringV1(selectedJob.dateStarted)}}</span>
              <br>
              <task-monitor-details :selectedJobId="selectedJob.id" ></task-monitor-details>
            </template>
          </template>
          <div v-else>
            No job have ran yet
          </div>
        </td>
      </tr>
    </table>

    
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { BindStoreModel, BindProp } from "@/decorator";
import { StoreType } from "@/store/types";
import { Agent } from "../store/agent/types";
import { User } from "@/store/user/types";
import VueSplit from "vue-split-panel";
import axios from "axios";
import { SgAlert, AlertPlacement, AlertCategory } from "@/store/alert/types";
import { focusElement } from "@/utils/Shared";
import { Script, ScriptType, scriptTypesForMonaco } from "@/store/script/types";
import { ScriptShadow } from '@/store/scriptShadow/types';
import { TaskDefTarget } from "@/store/taskDef/types";
import { BindSelected, BindSelectedCopy } from "@/decorator";
import { ValidationProvider, ValidationObserver } from "vee-validate";
import _ from "lodash";
import { momentToStringV1 } from "@/utils/DateTime";
import { Job } from '@/store/job/types';
import { getStompHandler } from '@/utils/StompHandler';
import { Task } from '@/store/task/types';
import { TaskOutcome } from '@/store/taskOutcome/types';
import { StepOutcome } from '@/store/stepOutcome/types';
import { StepDef, LambaRuntimes, LambdaMemorySizes } from '../store/stepDef/types';
import { JobStatus, TaskStatus, StepStatus, TaskFailureCode, enumKeyToPretty } from '@/utils/Enums.ts';
import { stringToMap } from '@/utils/Shared';
import AgentSearch from '@/components/AgentSearch.vue';
import ScriptEditor from '@/components/ScriptEditor.vue';
import { showErrors } from '@/utils/ErrorHandler';
import TaskMonitorDetails from "@/components/TaskMonitorDetails.vue";
import ScriptSearchWithCreate from '@/components/ScriptSearchWithCreate.vue';
import moment from 'moment';
import { Tabs, Tab } from 'vue-slim-tabs';

@Component({
  components: { 
    Tabs, 
    Tab, 
    AgentSearch, 
    ScriptSearchWithCreate, 
    ScriptEditor, 
    ValidationProvider, 
    ValidationObserver, 
    TaskMonitorDetails 
  }
})
export default class InteractiveConsole extends Vue {
  // Expose to templates
  private readonly scriptTypesForMonaco = scriptTypesForMonaco;
  private readonly TaskDefTarget = TaskDefTarget;
  private readonly momentToStringV1 = momentToStringV1;
  private readonly JobStatus = JobStatus;
  private readonly TaskStatus = TaskStatus;
  private readonly StepStatus = StepStatus;
  private readonly TaskFailureCode = TaskFailureCode;
  private readonly enumKeyToPretty = enumKeyToPretty;
  private readonly LambaRuntimes = LambaRuntimes;
  private readonly LambdaMemorySizes = LambdaMemorySizes;
  private readonly TargetAgentChoices = {
    'Any Available Agent': TaskDefTarget.SINGLE_AGENT,
    'A Specific Agent': TaskDefTarget.SINGLE_SPECIFIC_AGENT,
    'A Single Agent With Tags': TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
    'All Active Agents': TaskDefTarget.ALL_AGENTS,
    'All Active Agents With Tags': TaskDefTarget.ALL_AGENTS_WITH_TAGS
  };

  private runAgentTarget = TaskDefTarget.SINGLE_AGENT;
  private runAgentTargetAgentId = '';
  private runAgentTargetTags = {};
  private runAgentTargetTags_string = '';

  private runScriptCommand = '';
  private runScriptArguments = '';
  private runScriptEnvVars = '';
  private runScriptRuntimeVars = '';

  private lambdaConfig:any = {
    lambdaMemorySize: 128,
    lambdaTimeout: 3
  };

  private displayedText = '';

  private scriptId = null;

  @BindSelected({ storeType: <any>StoreType.ScriptStore.toString() })
  private script!: Script | null;

  @BindSelectedCopy({ storeType: StoreType.ScriptStore })
  private scriptCopy!: Script | null;

  @BindSelected({storeType: StoreType.ScriptShadowStore})
  private scriptShadow!: ScriptShadow|null;

  @BindSelected({ storeType: StoreType.JobStore })
  private selectedJob!: Job | null;

  private runningJobs: Job[] = [];

  @BindProp({storeType: StoreType.SecurityStore, selectedModelName: 'user', propName: 'id'})
  private loggedInUserId!: string;

  private async mounted() {
    if(this.script){
      this.scriptId = this.script.id;
    }
  }

  private beforeDestroy(){
    if(this.scriptCopy){
      // update script with a version of itself to undo any unsaved changes.  If changes have already
      // been saved it won't matter
      const script = this.script;
      this.script = null;
      this.script = script;
    }
  }

  private onTargetAgentPicked(agent: Agent){
    if(agent){
      this.runAgentTargetAgentId = agent.id;
    }
    else {
      console.log('reset target agent id to null');
      this.runAgentTargetAgentId = null;
    }
  }

  @Watch('runningJobs')
  private onRunningJobsChanged(){
    if(this.runningJobs.length > 0){
      this.$store.dispatch(`${StoreType.JobStore}/select`, this.runningJobs[this.runningJobs.length - 1]);
    }
    else {
      this.$store.dispatch(`${StoreType.JobStore}/select`, null);
    }
  }

  // a reactive map
  private loadedAgents: {[key: string]: Agent} = {}; // need a reactive prop

  // return a temp object while loading the reactive one
  private getAgent(agentId: string): Agent {
    if(!this.loadedAgents[agentId]){
      Vue.set(this.loadedAgents, agentId, {id: agentId, name: '...'});

      (async () => {
        const agent = await this.$store.dispatch(`${StoreType.AgentStore}/fetchModel`, agentId);
        this.loadedAgents[agentId] = agent;
      })();
    }

    return this.loadedAgents[agentId];
  }

  // for reactivity in a template
  private loadedUsers = {};
  private getUser(userId: string): User {
    if(!this.loadedUsers[userId]){
      Vue.set(this.loadedUsers, userId, {name: 'loading...'});

      (async () => {
        this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
      })();
    }

    return this.loadedUsers[userId];
  }

  private get olderRunningJobs(): Job[] {
    if(this.runningJobs.length > 1){
      const jobClone = _.clone(this.runningJobs); // shallow reference clone
      const olderJobs = jobClone.splice(0, jobClone.length - 1);
      olderJobs.reverse();
      return olderJobs;
    }
    else {
      return [];
    }
  }

  private async onTeamEditableChanged(script: Script){
    try {
      await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: {id: script.id, teamEditable: script.teamEditable}});
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script saved`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors('Error saving the script', err);
    }
  }

  private onScriptPicked(script: Script) {
    this.script = script; // will also update the scriptCopy
  }

  @Watch('scriptCopy')
  private onScriptCopyChanged() {
    if(this.script){
      this.scriptId = this.script.id;

      // Update the browser's url for the newly selected script
      if(!this.$router.currentRoute.params['scriptId'] !== this.scriptId){
        this.$router.replace({name: 'interactiveConsole', params: {scriptId: this.scriptId}});
      }
    }
    else {
      this.scriptId = null;
    }
  }

  private async onRunScriptClicked() {
    this.$modal.show('pick-agents-modal');
  }

  private onCancelRunScript(){
    this.$modal.hide('pick-agents-modal');
  }

  private get envVarsAsMap(): {[key: string]: string} {
    return stringToMap(this.runScriptEnvVars);
  }

  private get runtimeVarsAsMap(): {[key: string]: string} {
    return stringToMap(this.runScriptRuntimeVars);
  }

  private async onRunScript(){
    if( ! await (<any>this.$refs.runScriptValidationObserver).validate()){
      return;
    }
    if(!this.scriptShadow){
      console.error('Script shadow was not loaded so it could not be run.');
      return;
    }

    const runInLambda = (<any>this.$refs.runSettingsTabs).selectedIndex === 1;
    const currentTeamId = this.$store.state[StoreType.TeamStore].selected.id;

    try {
      const newStep: any = {
        name: 'Step1',
        script: {
          scriptType: ScriptType[this.scriptCopy.scriptType],
          code: this.scriptShadow.shadowCopyCode
        },
        order: 0,
        command: this.runScriptCommand,
        arguments: this.runScriptArguments,
        variables: this.envVarsAsMap
      };

      if(runInLambda){
        this.runAgentTarget = TaskDefTarget.AWS_LAMBDA;
        newStep.lambdaRuntime = this.lambdaConfig.lambdaRuntime;
        newStep.lambdaMemorySize = this.lambdaConfig.lambdaMemorySize;
        newStep.lambdaTimeout = this.lambdaConfig.lambdaTimeout;
        newStep.lambdaDependencies = this.lambdaConfig.lambdaDependencies;
      }

      const newJob = {
        job: {
          name: `IC-${moment().format('dddd MMM DD h:mm a')}`,
          dateCreated: (new Date()).toISOString(),
          runtimeVars: this.runtimeVarsAsMap,
          tasks: [
            {
              _teamId: currentTeamId,
              name: `Task1`,
              source: 0,
              requiredTags: stringToMap(this.runAgentTargetTags_string),
              target: this.runAgentTarget,
              targetAgentId: this.runAgentTargetAgentId,
              fromRoutes: [],
              steps: [ newStep ],
              correlationId: Math.random().toString().substring(3, 12)
            }
          ]
        }
      };



      const {data: {data}} = await axios.post("/api/v0/job/ic/", newJob);
      // make sure to use the same object in the store or it won't be reactive to browser push events
      this.runningJobs.push(await this.$store.dispatch(`${StoreType.JobStore}/fetchModel`, data.id));
    } 
    catch (err) {
      console.error(err);
      showErrors('Error running the script', err);
    }
    finally {
      this.$modal.hide('pick-agents-modal');
    }
  }

  private async onCancelJobClicked(){
    try {
      await axios.post(`api/v0/jobaction/cancel/${this.selectedJob.id}`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Job cancelled`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors('Error cancelling job', err);
    }
  }

  private async onCancelTaskOutcomeClicked(taskOutcome: TaskOutcome){
    try {
      await axios.post(`/api/v0/taskoutcomeaction/cancel/${taskOutcome.id}`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Task cancelled`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors('Error cancelling task', err);
    }
  }

  private onClickedJob(job: Job){
    const routeData = this.$router.resolve({name: 'jobDetailsMonitor', params: {jobId: job.id}});
    window.open(routeData.href, '_blank');
  }

  private async onScheduleScriptClicked(){
    if(this.script){
      try {
        const {data: {data}} = await axios.post(`/api/v0/jobdef/script/`, {_scriptId: this.script.id});
        const routeData = this.$router.resolve({name: 'jobDesigner', params: {jobId: data.id, tabName: 'schedule'}});
        window.open(routeData.href, '_blank');
      }
      catch (err) {
        console.error(err);
        showErrors('Error scheduling script', err);
      }
    }
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

.script-button-bar {
  display: flex;
  justify-content: space-between;
}

.v--modal-overlay[data-modal="script-editor-fullscreen"] {
  background: white;
}

.button-spaced {
  margin-left: 10px;
}

.validation-error {
  margin-top: 3px;
  margin-bottom: 3px;
  padding-left: 3px;
  padding-right: 3px;
  color: $danger;
  font-size: 18px;
}

.spaced {
  margin-left: 14px;
  margin-right: 14px;
  text-align: center;
  line-height: 36px;
  //vertical-align: middle;
}
</style>
