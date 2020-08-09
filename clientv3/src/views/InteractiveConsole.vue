<template>
  <div class="main" style="margin-left: 12px; margin-right: 12px;">

    <!-- Create script modal -->
    <modal name="create-script-modal" :classes="'round-popup'" :width="450" :height="250">
      <validation-observer ref="createScriptValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
            <tr class="tr">
              <td class="td"></td>
              <td class="td">Create a new script</td>
            </tr>
            <tr class="tr">
              <td class="td">Script Name</td>
              <td class="td">
                <validation-provider
                  name="Script Name"
                  rules="required|object-name"
                  v-slot="{ errors }"
                >
                  <input
                    class="input"
                    id="create-script-modal-autofocus"
                    type="text"
                    v-on:keyup.enter="saveNewScript"
                    v-model="newScriptName"
                    placeholder="Enter the new script name"
                  />
                  <div
                    v-if="errors && errors.length > 0"
                    class="message validation-error is-danger"
                  >{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">Script Type</td>
              <td class="td">
                <validation-provider name="Script Type" rules="required" v-slot="{ errors }">
                  <select
                    class="input select"
                    style="width: 250px; margin-top: 10px;"
                    v-model="newScriptType"
                  >
                    <option
                      v-for="(value, key) in scriptTypesForMonaco"
                      v-bind:key="`scriptType${key}-${value}`"
                      :value="key"
                    >{{value}}</option>
                  </select>
                  <div
                    v-if="errors && errors.length > 0"
                    class="message validation-error is-danger"
                  >{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="saveNewScript">Create new script</button>
                <button class="button button-spaced" @click="cancelCreateNewScript">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </validation-observer>
    </modal>


    <!-- Pick agents modal - for running scripts -->
    <modal name="pick-agents-modal" :classes="'round-popup'" :width="800" :height="700">
      <validation-observer ref="runScriptValidationObserver">
        <table class="table">
          <tbody class="tbody">
            <tr class="tr">
              <td class="td"></td>
              <td class="td">Run on single agent</td>
              <td class="td">
                <span style="margin-left:40px;">Run on multiple agents</span>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <input
                  type="radio"
                  class="radio"
                  v-model="runAgentTarget"
                  :value="TaskDefTarget.SINGLE_SPECIFIC_AGENT"
                /> This agent
              </td>
              <td class="td">
                <input
                  type="radio"
                  class="radio"
                  style="margin-left: 40px;"
                  v-model="runAgentTarget"
                  :value="TaskDefTarget.ALL_AGENTS_WITH_TAGS"
                /> Active agents with tags
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <agent-search :agentId="runAgentTargetAgentId"  @agentPicked="onTargetAgentPicked" :disabled="runAgentTarget !== TaskDefTarget.SINGLE_SPECIFIC_AGENT"></agent-search>
              </td>
              <td class="td">
                <validation-provider name="Target Tags" rules="variable-map" v-slot="{ errors }">
                  <input
                    type="text"
                    class="input"
                    style="margin-left: 60px; width: 300px;"
                    v-model="runAgentTargetTags_string"
                    :disabled="runAgentTarget !== TaskDefTarget.ALL_AGENTS_WITH_TAGS"
                  />
                  <div
                    v-if="errors && errors.length > 0"
                    class="message validation-error is-danger"
                    style="margin-left: 60px;"
                  >{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <input
                  type="radio"
                  class="radio"
                  v-model="runAgentTarget"
                  :value="TaskDefTarget.SINGLE_AGENT_WITH_TAGS"
                /> An agent with tags
              </td>
              <td class="td">
                <input
                  type="radio"
                  class="radio"
                  style="margin-left: 40px;"
                  v-model="runAgentTarget"
                  :value="TaskDefTarget.ALL_AGENTS"
                /> All active agents
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <validation-provider name="Target Tags" rules="variable-map" v-slot="{ errors }">
                  <input
                    type="text"
                    class="input"
                    style="margin-left: 20px; width: 300px;"
                    v-model="runAgentTargetTags_string"
                    :disabled="runAgentTarget !== TaskDefTarget.SINGLE_AGENT_WITH_TAGS"
                  />
                  <div
                    v-if="errors && errors.length > 0"
                    class="message validation-error is-danger"
                    style="margin-left: 20px;"
                  >{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <input
                  type="radio"
                  class="radio"
                  v-model="runAgentTarget"
                  :value="TaskDefTarget.SINGLE_AGENT"
                /> Any active agent
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td"></td>
              <td class="td">
                <table class="table">
                  <tr class="tr">
                    <td class="td">
                      Command
                    </td>
                    <td class="td">
                      <input class="input" type="text" v-model="runScriptCommand"/>
                    </td>
                  </tr>
                  <tr class="tr">
                    <td class="td">
                      Arguments
                    </td>
                    <td class="td">
                      <input class="input" type="text" v-model="runScriptArguments"/>
                    </td>
                  </tr>
                  <tr class="tr">
                    <td class="td">
                      Env Variables
                    </td>
                    <td class="td">
                      <validation-provider name="Env Vars" rules="variable-map" v-slot="{ errors }">
                        <input class="input" type="text" v-model="runScriptEnvVars"/>
                        <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                      </validation-provider>
                    </td>
                  </tr>
                  <tr class="tr">
                    <td class="td">
                      Runtime Variables
                    </td>
                    <td class="td">
                      <validation-provider name="Runtime Vars" rules="variable-map" v-slot="{ errors }">
                        <input class="input" type="text" v-model="runScriptRuntimeVars"/>
                        <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                      </validation-provider>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr class="tr">
              <td class="td" colspan="2"></td>
              <td class="td">
                <button class="button is-primary" @click="onRunScript">Run Script</button>
                <button class="button button-spaced" @click="onCancelRunScript">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </validation-observer>
    </modal>


    <!-- Clone script modal -->
    <modal name="clone-script-modal" :classes="'round-popup'" :width="400" :height="200">
      <validation-observer ref="cloneScriptValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
             <tr class="tr">
              <td class="td"></td>
              <td class="td">Clone script</td>
            </tr>
            <tr class="tr">
              <td class="td">Script Name</td>
              <td class="td">
                <validation-provider name="Script Name" rules="required|object-name" v-slot="{ errors }">
                  <input class="input" id="clone-script-modal-autofocus" type="text" v-on:keyup.enter="cloneScript" v-model="cloneScriptName" placeholder="Enter the new script name">
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="cloneScript">Clone script</button> 
                <button class="button button-spaced" @click="cancelCloneScript">Cancel</button>
              </td>
            </tr>
          </tbody> 
        </table>
      </validation-observer>
    </modal>


    <!-- Show text (script or stdout) modal -->
    <modal name="show-script-modal" :classes="'round-popup'" :width="800" :height="650">
      <table class="table" width="100%" height="100%">
        <tr class="tr">
          <td class="td">
            <strong>script for step: {{stepOutcomeForPopup && stepOutcomeForPopup.name}}</strong>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <div v-if="stepOutcomeForPopup  && stepOutcomeForPopup.runCode" 
                 style="overflow: scroll; width: 750px; height: 525px;" 
                 v-html="stepOutcomeForPopup.runCode.replace(/\n/g, '<br>')"></div>
            <div v-else>
              Code was missing
            </div>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="onCloseScriptModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>


    <modal name="show-stdout-modal" :classes="'round-popup'" :width="800" :height="650">
      <table class="table" width="100%" height="100%">
        <tr class="tr">
          <td class="td">
            <strong>stdout for step: {{stepOutcomeForPopup && stepOutcomeForPopup.name}}</strong>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <div v-if="stepOutcomeForPopup  && stepOutcomeForPopup.stdout" 
                 style="overflow: scroll; width: 750px; height: 525px;" 
                 v-html="formatStdString(stepOutcomeForPopup.stdout)"></div>
            <div v-else>
              No stdout available yet...
            </div>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="onCloseStdoutModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>


    <modal name="show-stderr-modal" :classes="'round-popup'" :width="800" :height="650">
      <table class="table" width="100%" height="100%">
        <tr class="tr">
          <td class="td">
            <strong>stderr for step: {{stepOutcomeForPopup && stepOutcomeForPopup.name}}</strong>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <div v-if="stepOutcomeForPopup  && stepOutcomeForPopup.stderr" 
                 style="overflow: scroll; width: 750px; height: 525px;" 
                 v-html="formatStdString(stepOutcomeForPopup.stderr)"></div>
            <div v-else>
              No stderr available yet...
            </div>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="onCloseStderrModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>




    <table class="table" style="width: 100%;">
      <tr class="tr">
        <td class="td" colspan="2">
          <button class="button" @click="onCreateScriptClicked">Create Script</button>
          <script-search :scriptId="scriptId" @scriptPicked="onScriptPicked"></script-search>
          <button class="button button-spaced" style="margin-left: 12px;" :disabled="!scriptCopy" @click="onCloneScriptClicked">Clone</button>
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
            <div v-if="selectedJob">
              <span class="spaced">{{selectedJob.name}}</span>
              <button class="button button-spaced" :disabled="selectedJob.status!==JobStatus.RUNNING && selectedJob.status!==JobStatus.INTERRUPTED" @click="onCancelJobClicked">Cancel</button>              
              <span class="spaced">{{enumKeyToPretty(JobStatus, selectedJob.status)}}</span>
              <span class="spaced">{{momentToStringV1(selectedJob.dateStarted)}}</span>
 
              <div style="margin-left: 10px;">
                <div v-for="taskOutcome in taskOutcomes" v-bind:key="taskOutcome.id" style="margin-top: 20px;">
                  <span class="spaced">{{getAgent(taskOutcome._agentId).name}}</span>
                  <button class="button button-spaced" :disabled="taskOutcome.status!==TaskStatus.RUNNING && taskOutcome.status!==TaskStatus.INTERRUPTED" @click="onCancelTaskOutcomeClicked(taskOutcome)">Cancel</button>
                  <span class="spaced">{{enumKeyToPretty(JobStatus, taskOutcome.status)}}</span>
                  <span class="spaced">{{enumKeyToPretty(TaskFailureCode, taskOutcome.failureCode)}}</span>
                  <span class="spaced">{{momentToStringV1(taskOutcome.dateStarted)}}</span>

                  <div v-for="stepOutcome in getStepOutcomes(taskOutcome)" v-bind:key="stepOutcome.id">
                    <div style="margin-left: 30px; margin-top: 10px;">
                      <span class="spaced">{{stepOutcome.name}}</span>
                      <span class="spaced">{{enumKeyToPretty(JobStatus, stepOutcome.status)}}</span>
                      <span class="spaced">{{enumKeyToPretty(TaskFailureCode, stepOutcome.failureCode)}}</span>
                      <span class="spaced">{{momentToStringV1(stepOutcome.dateStarted)}}</span>
                      <span class="spaced">{{momentToStringV1(stepOutcome.dateCompleted)}}</span>
                      <span class="spaced">{{stepOutcome.runtimeVars}}</span>
                      <span class="spaced"><a @click.prevent="onShowScriptClicked(stepOutcome)">script</a></span>
                      <span class="spaced"><a @click.prevent="onShowStdoutClicked(stepOutcome)">stdout</a></span>
                      <span class="spaced"><a @click.prevent="onShowStderrClicked(stepOutcome)">stderr</a></span>
                    </div>
                    <div v-if="stepOutcome.tail && stepOutcome.tail.length > 4" style="margin-left: 54px; margin-top: 10px;">
                      {{stepOutcome.tail[4]}}
                    </div>
                    <div v-if="stepOutcome.tail && stepOutcome.tail.length > 3" style="margin-left: 54px; margin-top: 10px;">
                      {{stepOutcome.tail[3]}}
                    </div>
                    <div v-if="stepOutcome.tail && stepOutcome.tail.length > 2" style="margin-left: 54px; margin-top: 10px;">
                      {{stepOutcome.tail[2]}}
                    </div>
                    <div v-if="stepOutcome.tail && stepOutcome.tail.length > 1" style="margin-left: 54px; margin-top: 10px;">
                      {{stepOutcome.tail[1]}}
                    </div>
                    <div v-if="stepOutcome.tail && stepOutcome.tail.length > 0" style="margin-left: 54px; margin-top: 10px;">
                      {{stepOutcome.tail[0]}}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <table class="table" style="margin-top: 20px;">
                <thead class="thead">
                  <tr class="tr">
                    <td class="td">
                      Job Name
                    </td>
                    <td class="td">
                      Status
                    </td>
                    <td class="td">
                      Started
                    </td>
                    <td class="td">
                      Completed
                    </td>
                  </tr>
                </thead>
                <tr class="tr" v-for="job in olderRunningJobs" v-bind:key="job.id">
                  <td class="td">
                      <a @click.prevent="onClickedJob(job)">{{job.name}}</a>
                    </td>
                    <td class="td">
                      {{enumKeyToPretty(JobStatus, job.status)}}
                    </td>
                    <td class="td">
                      {{momentToStringV1(job.dateStarted)}}
                    </td>
                    <td class="td">
                      {{momentToStringV1(job.dateCompleted)}}
                    </td>
                </tr>
              </table>
            </div>
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
import { BindStoreModel } from "@/decorator";
import { StoreType } from "@/store/types";
import { Agent } from "../store/agent/types";
import VueSplit from "vue-split-panel";
import axios from "axios";
import { SgAlert, AlertPlacement, AlertCategory } from "@/store/alert/types";
import { focusElement } from "@/utils/Shared";
import { Script, ScriptType, scriptTypesForMonaco } from "@/store/script/types";
import { TaskDefTarget } from "@/store/taskDef/types";
import ScriptSearch from "@/components/ScriptSearch.vue";
import { BindSelected, BindSelectedCopy } from "@/decorator";
import { ValidationProvider, ValidationObserver } from "vee-validate";
import _ from "lodash";
import { momentToStringV1 } from "@/utils/DateTime";
import { Job } from '@/store/job/types';
import { getStompHandler } from '@/utils/StompHandler';
import { Task } from '@/store/task/types';
import { TaskOutcome } from '@/store/taskOutcome/types';
import { StepOutcome } from '@/store/stepOutcome/types';
import { JobStatus, TaskStatus, StepStatus, TaskFailureCode, enumKeyToPretty } from '@/utils/Enums.ts';
import { stringToMap } from '@/utils/Shared';
import AgentSearch from '@/components/AgentSearch.vue';
import ScriptEditor from '@/components/ScriptEditor.vue';
import { showErrors } from '@/utils/ErrorHandler';
import moment from 'moment';

@Component({
  components: { AgentSearch, ScriptSearch, ScriptEditor, ValidationProvider, ValidationObserver },
  props: {}
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

  private newScriptName: string = '';
  private newScriptType: ScriptType = ScriptType.NODE;
  private cloneScriptName: string = '';

  private runAgentTarget = TaskDefTarget.SINGLE_AGENT;
  private runAgentTargetAgentId = '';
  private runAgentTargetTags = {};
  private runAgentTargetTags_string = '';

  private runScriptCommand = '';
  private runScriptArguments = '';
  private runScriptEnvVars = '';
  private runScriptRuntimeVars = '';

  private displayedText = '';

  private scriptId = null;

  @BindSelected({ storeType: <any>StoreType.ScriptStore.toString() })
  private script!: Script | null;

  @BindSelectedCopy({ storeType: StoreType.ScriptStore })
  private scriptCopy!: Script | null;

  @BindSelected({ storeType: StoreType.JobStore })
  private selectedJob!: Job | null;

  private runningJobs: Job[] = [];

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

  private onCreateScriptClicked() {
    this.newScriptName = '';
    this.$modal.show('create-script-modal');
    focusElement('create-script-modal-autofocus');
  }

  private onScriptPicked(script: Script) {
    this.script = script; // will also update the scriptCopy
  }

  @Watch("scriptCopy")
  private onScriptCopyChanged() {
    if(this.script){
      this.scriptId = this.script.id;
    }
    else {
      this.scriptId = null;
    }
  }

  private async onCloneScriptClicked() {
    if(this.script){
      this.cloneScriptName = `${this.script.name}Copy`;
      this.$modal.show('clone-script-modal');
      focusElement('clone-script-modal-autofocus');
    }
  }

  private async saveNewScript() {
    if (!(await (<any>this.$refs.createScriptValidationObserver).validate())) {
      return;
    }

    try {
      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert(
          `Creating script - ${this.newScriptName}`,
          AlertPlacement.FOOTER
        )
      );
      const newScript = {
        name: this.newScriptName,
        scriptType: this.newScriptType,
        code: '',
        shadowCopyCode: '',
        lastEditedDate: new Date().toISOString()
      };

      this.script = await this.$store.dispatch(
        `${StoreType.ScriptStore}/save`,
        newScript
      );
    } 
    catch (err) {
      console.error(err);
      showErrors('Error creating script', err);
    } 
    finally {
      this.$modal.hide("create-script-modal");
    }
  }

  private cancelCreateNewScript() {
    this.$modal.hide("create-script-modal");
  }

  private async onSaveScriptClicked() {
    try {
      if (this.scriptCopy) {
        this.script = await this.$store.dispatch(`${StoreType.ScriptStore}/save`, this.scriptCopy);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script saved`, AlertPlacement.FOOTER));
      }
    } 
    catch (err) {
      console.error(err);
      showErrors('Error saving script', err);
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

    const currentOrgId = this.$store.state[StoreType.OrgStore].selected.id;

    try {
      const newJob = {
        job: {
          name: `IC-${moment().format('dddd MMM DD h:m a')}`,
          dateCreated: (new Date()).toISOString(),
          runtimeVars: this.runtimeVarsAsMap,
          tasks: [
            {
              _orgId: currentOrgId,
              name: `Task1`,
              source: 0,
              requiredTags: stringToMap(this.runAgentTargetTags_string),
              target: this.runAgentTarget,
              targetAgentId: this.runAgentTargetAgentId,
              fromRoutes: [],
              steps: [
                {
                  name: "Step1",
                  script: {
                    scriptType: ScriptType[this.scriptCopy.scriptType],
                    code: btoa(this.scriptCopy.shadowCopyCode)
                  },
                  order: 0,
                  command: this.runScriptCommand,
                  arguments: this.runScriptArguments,
                  variables: this.envVarsAsMap
                }
              ],
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

  private async cloneScript(){
    if(this.scriptCopy){
      if( ! await (<any>this.$refs.cloneScriptValidationObserver).validate()){
        return;
      }

      try {
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Cloning script - ${this.cloneScriptName}`, AlertPlacement.FOOTER));      
        const newScript = {
          name: this.cloneScriptName, 
          scriptType: this.scriptCopy.scriptType, 
          code: this.scriptCopy.shadowCopyCode, 
          shadowCopyCode: this.script.shadowCopyCode,
          lastEditedDate: (new Date()).toISOString()
        };

        this.script = await this.$store.dispatch(`${StoreType.ScriptStore}/save`, newScript);
      }
      catch(err){
        console.error(err);
        showErrors('Error cloning script', err);
      }
      finally{
        this.$modal.hide('clone-script-modal');
      }
    }
  }

  private cancelCloneScript(){
    this.$modal.hide('clone-script-modal');
  }

  private get taskOutcomes(): Task[]{
    if(this.selectedJob){
      return <Task[]> this.$store.getters[`${StoreType.TaskOutcomeStore}/getByJobId`](this.selectedJob.id);
    }
    else {
      return [];
    }
  } 

  private getStepOutcomes(taskOutcome: TaskOutcome){
    return this.$store.getters[`${StoreType.StepOutcomeStore}/getByTaskOutcomeId`](taskOutcome.id);
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

  private stepOutcomeForPopup: StepOutcome | null = null;

  private onShowScriptClicked(stepOutcome: StepOutcome){
    this.stepOutcomeForPopup = stepOutcome;
    this.$modal.show('show-script-modal');
  }

  private onShowStdoutClicked(stepOutcome: StepOutcome){
    this.stepOutcomeForPopup = stepOutcome;
    this.$modal.show('show-stdout-modal');
  }

  private onShowStderrClicked(stepOutcome: StepOutcome){
    this.stepOutcomeForPopup = stepOutcome;
    this.$modal.show('show-stderr-modal');
  }

  private onCloseScriptModalClicked(){
    this.stepOutcomeForPopup = null;
    this.$modal.hide('show-script-modal');
  }

  private onCloseStdoutModalClicked(){
    this.stepOutcomeForPopup = null;
    this.$modal.hide('show-stdout-modal');
  }

  private onCloseStderrModalClicked(){
    this.stepOutcomeForPopup = null;
    this.$modal.hide('show-stderr-modal');
  }

  private formatStdString(std: string): string {
    return std.split('\n').reverse().join('<br>');
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
