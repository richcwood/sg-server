<template>
  <div class="py-5">
    <div class="sg-container-px mb-5">
      <script-search-with-create class="block" width="400px" :scriptId="scriptId" @scriptPicked="onScriptPicked" />

      <div class="is-flex block">
        <div class="mr-4">
          <span class="has-text-weight-bold mr-3">Original Author</span>
          <span v-if="script">{{ getUser(script._originalAuthorUserId).name }}</span>
        </div>
        <div class="mr-4">
          <span class="has-text-weight-bold mr-3">Last Edited By</span>
          <span v-if="script"
            >{{ getUser(script._lastEditedUserId).name }} on {{ momentToStringV1(script.lastEditedDate) }}</span
          >
        </div>
        <div class="is-flex">
          <span class="has-text-weight-bold mr-3">Team Members Can Edit</span>
          <template v-if="script">
            <div class="control">
              <div class="checkbox">
                <input
                  type="checkbox"
                  v-model="script.teamEditable"
                  :disabled="script._originalAuthorUserId !== loggedInUserId"
                  @change="onTeamEditableChanged(script)"
                />
              </div>
            </div>
            <span v-if="script._originalAuthorUserId !== loggedInUserId" style="color:gray;"
              >(orignal author: {{ getUser(script._originalAuthorUserId).name }})</span
            >
          </template>
        </div>
      </div>
      <script-editor :script="scriptCopy" />
    </div>

    <validation-observer tag="div" ref="runScriptValidationObserver">
      <tabs ref="runSettingsTabs" :onSelect="onTabSelect">
        <tab class="sg-container-p" title="Run on Agent(s)">
          <table class="table is-fullwidth">
            <tr>
              <td>
                <label class="label" style="width: 150px;">Target Agent(s)</label>
              </td>
              <td>
                <select class="input" style="width: 350px;" v-model="runAgentTarget">
                  <option
                    v-for="(targetIndex, targetName) in TargetAgentChoices"
                    :key="`target-choice-${targetIndex}`"
                    :value="targetIndex"
                  >
                    {{ targetName }}
                  </option>
                </select>
              </td>
            </tr>
            <tr v-if="runAgentTarget === TaskDefTarget.SINGLE_SPECIFIC_AGENT">
              <td>
                <label class="label" style="width: 150px;">Target Agent</label>
              </td>
              <td>
                <agent-search
                  :width="'350px'"
                  :agentId="runAgentTargetAgentId"
                  @agentPicked="onTargetAgentPicked"
                ></agent-search>
              </td>
            </tr>
            <tr
              v-if="
                runAgentTarget === TaskDefTarget.ALL_AGENTS_WITH_TAGS ||
                  runAgentTarget === TaskDefTarget.SINGLE_AGENT_WITH_TAGS
              "
            >
              <td>
                <label class="label" style="width: 150px;">Target Agent Tags</label>
              </td>
              <td>
                <validation-provider name="Target Tags" rules="variable-map" v-slot="{ errors }">
                  <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
                  <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
                  <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
                  <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
                  <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
          </table>
        </tab>

        <tab class="sg-container-p" title="Run on AWS Lambda">
          <table class="table is-fullwidth">
            <tr>
              <td>
                <label class="label" style="width: 150px;">Lambda Runtime</label>
              </td>
              <td>
                <div class="select">
                  <validation-provider name="Lambda Runtime" rules="required" v-slot="{ errors }">
                    <LambdaRuntimeSelect v-model="lambdaRuntime" :scriptType="scriptType" style="width: 350px;" />
                    <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                      {{ errors[0] }}
                    </div>
                  </validation-provider>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <label class="label" style="width: 150px;">Lambda Memory Size</label>
              </td>
              <td>
                <div class="select">
                  <select v-model="lambdaMemory" style="width: 350px;">
                    <option v-for="memSize in LambdaMemorySizes" :key="memSize" :value="memSize">
                      {{ memSize }} mb
                    </option>
                  </select>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <label class="label" style="width: 150px;">Lambda Timeout (seconds)</label>
              </td>
              <td>
                <validation-provider name="Lambda Timeout" rules="required|lambdaTimeout" v-slot="{ errors }">
                  <input class="input" style="width: 350px;" v-model="lambdaTimeout" />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr>
              <td>
                <label class="label" style="width: 150px;">Lambda Dependencies</label>
              </td>
              <td>
                <input
                  class="input"
                  style="width: 350px;"
                  v-model="lambdaDependencies"
                  placeholder="compression;axios"
                />
              </td>
            </tr>
          </table>
        </tab>
        <tab v-if="latestRanJobId && selectedJob" class="sg-container-p" titleSlot="results-title">
          <div class="is-flex is-align-items-center">
            <span class="mr-3">{{ selectedJob.name }}</span>
            <button
              class="button is-ghost mr-3"
              :disabled="selectedJob.status !== JobStatus.RUNNING && selectedJob.status !== JobStatus.INTERRUPTED"
              @click="onCancelJobClicked"
            >
              Cancel
            </button>
            <span class="mr-3">{{ enumKeyToPretty(JobStatus, selectedJob.status) }}</span>
            <span class="mr-3">{{ momentToStringV1(selectedJob.dateStarted) }}</span>
          </div>
          <task-monitor-details :selectedJobId="selectedJob.id" />
        </tab>
        <template #results-title>
          <span id="ic-results-tab">
            <span class="script-run-spinner" v-if="isScriptRunning"></span>
            Script Results
          </span>
        </template>
      </tabs>

      <hr class="divider" />

      <div class="sg-container-p">
        <table class="table is-fullwidth">
          <tr>
            <td>
              <label class="label" style="width: 150px;">Command</label>
            </td>
            <td>
              <input class="input" style="width: 350px;" type="text" v-model="runScriptCommand" />
            </td>
          </tr>
          <tr>
            <td>
              <label class="label" style="width: 150px;">Arguments</label>
            </td>
            <td>
              <input class="input" style="width: 350px;" type="text" v-model="runScriptArguments" />
            </td>
          </tr>
          <tr>
            <td>
              <label class="label" style="width: 150px;">Env Variables</label>
            </td>
            <td>
              <validation-provider name="Env Vars" rules="variable-map" v-slot="{ errors }">
                <input class="input" style="width: 350px;" type="text" v-model="runScriptEnvVars" />
                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
              </validation-provider>
            </td>
          </tr>
          <tr>
            <td colspan="2">
              <p class="has-text-left">
                <label class="label">Runtime Variables</label>
              </p>
              <VariableList class="my-3" v-model="runScriptRuntimeVars" />
            </td>
          </tr>
          <tr>
            <td></td>
            <td>
              <button @click="onRunScript"
                :disabled="!scriptCopy || isJobRunning"
                :class="{'is-loading': isJobRunning}"
                class="button is-primary mr-3">
                Run Script
              </button>
              <button class="button" @click="onScheduleScriptClicked" :disabled="!scriptCopy">Schedule Script</button>
            </td>
          </tr>
        </table>
      </div>
    </validation-observer>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { StoreType } from "../store/types";
import { Agent } from "../store/agent/types";
import { User } from "../store/user/types";
import axios from "axios";
import { SgAlert, AlertPlacement } from "../store/alert/types";
import { Script, ScriptType, scriptTypesForMonaco } from "../store/script/types";
import { ScriptShadow } from "../store/scriptShadow/types";
import { TaskDefTarget } from "../store/taskDef/types";
import { BindSelected, BindProp, BindSelectedCopy } from "../decorator";
import { ValidationProvider, ValidationObserver } from "vee-validate";
import _ from "lodash";
import { momentToStringV1 } from "../utils/DateTime";
import { ICJobSettings, Job } from "../store/job/types";
import { TaskOutcome } from "../store/taskOutcome/types";
import { LambdaMemorySizes, LambdaRuntimes } from "@/store/stepDef/types";
import { JobStatus, StepStatus, TaskFailureCode, enumKeyToPretty } from "../utils/Enums";
import AgentSearch from "../components/AgentSearch.vue";
import ScriptEditor from "../components/ScriptEditor.vue";
import { showErrors } from "../utils/ErrorHandler";
import TaskMonitorDetails from "../components/TaskMonitorDetails.vue";
import ScriptSearchWithCreate from "../components/ScriptSearchWithCreate.vue";
import { Tabs, Tab } from "vue-slim-tabs";
import { ScriptTarget, ICTab } from "@/store/interactiveConsole/types";
import LambdaRuntimeSelect from "@/components/LambdaRuntimeSelect.vue";
import { VariableMap } from "@/components/runtimeVariable/types";
import { VariableList } from '@/components/runtimeVariable';

@Component({
  components: {
    Tabs,
    Tab,
    AgentSearch,
    ScriptSearchWithCreate,
    ScriptEditor,
    ValidationProvider,
    ValidationObserver,
    TaskMonitorDetails,
    LambdaRuntimeSelect,
    VariableList
  },
})
export default class InteractiveConsole extends Vue {
  // Expose to templates
  private readonly scriptTypesForMonaco = scriptTypesForMonaco;
  private readonly TaskDefTarget = TaskDefTarget;
  private readonly momentToStringV1 = momentToStringV1;
  private readonly JobStatus = JobStatus;
  private readonly StepStatus = StepStatus;
  private readonly TaskFailureCode = TaskFailureCode;
  private readonly enumKeyToPretty = enumKeyToPretty;
  private readonly LambdaMemorySizes = LambdaMemorySizes;
  public readonly ScriptTarget = ScriptTarget;
  private readonly TargetAgentChoices = {
    "Any Available Agent": TaskDefTarget.SINGLE_AGENT,
    "A Specific Agent": TaskDefTarget.SINGLE_SPECIFIC_AGENT,
    "A Single Agent With Tags": TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
    "All Active Agents": TaskDefTarget.ALL_AGENTS,
    "All Active Agents With Tags": TaskDefTarget.ALL_AGENTS_WITH_TAGS,
  };

  public isScriptRunning = false;
  public isJobRunning = false;
  private scriptId = null;

  @BindSelected({ storeType: StoreType.ScriptStore })
  private script: Script;

  @BindSelectedCopy({ storeType: StoreType.ScriptStore })
  public scriptCopy: Script;

  @BindProp({ storeType: StoreType.ScriptStore })
  public scriptType: ScriptType;

  @BindSelected({ storeType: StoreType.ScriptShadowStore })
  private scriptShadow: ScriptShadow;

  @BindSelectedCopy({ storeType: StoreType.ScriptShadowStore })
  private scriptShadowCopy: ScriptShadow;

  @BindSelected({ storeType: StoreType.JobStore })
  private selectedJob: Job;

  @BindProp({ storeType: StoreType.SecurityStore, selectedModelName: "user", propName: "id" })
  public loggedInUserId: string;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public scriptTarget: ScriptTarget;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public runScriptCommand: string;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public runScriptArguments: string;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public runScriptEnvVars: string;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public runScriptRuntimeVars: VariableMap;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public runAgentTarget: TaskDefTarget;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  private runAgentTargetAgentId: string;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  private runAgentTargetTags_string: string;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public lambdaDependencies: string;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public lambdaRuntime: LambdaRuntimes;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public lambdaMemory: number;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public lambdaTimeout: number;

  @BindProp({ storeType: StoreType.InteractiveConsole })
  public latestRanJobId: string;

  private async mounted() {
    if (this.script) {
      this.scriptId = this.script.id;
    }
  }

  private beforeDestroy() {
    if (this.scriptCopy) {
      // update script with a version of itself to undo any unsaved changes.  If changes have already
      // been saved it won't matter
      const script = this.script;
      this.script = null;
      this.script = script;
    }

    this.$store.dispatch(`${StoreType.InteractiveConsole}/updateSelectedCopy`, {
      latestRanJobId: null
    });
  }

  private onTargetAgentPicked(agent: Agent) {
    if (agent) {
      this.runAgentTargetAgentId = agent.id;
    } else {
      console.log("reset target agent id to null");
      this.runAgentTargetAgentId = null;
    }
  }

  @Watch('selectedJob.status')
  public onJobStatusChange (status: JobStatus): void {
    const isRunning = status === JobStatus.RUNNING;

    if (isRunning) {
      this.selectTab(ICTab.RESULTS);
    }

    this.isScriptRunning = isRunning;
  }

  public onTabSelect (e: MouseEvent, index: ICTab): void {
    switch (index) {
      case ICTab.LAMBDA:
        this.scriptTarget = ScriptTarget.LAMBDA
        break;
      default:
        this.scriptTarget = ScriptTarget.AGENT;
    }
  }

  private selectTab (index: ICTab): void {
    (<any>this.$refs.runSettingsTabs).selectedIndex = index;
  }

  // a reactive map
  private loadedAgents: { [key: string]: Agent } = {}; // need a reactive prop

  // return a temp object while loading the reactive one
  private getAgent(agentId: string): Agent {
    if (!this.loadedAgents[agentId]) {
      Vue.set(this.loadedAgents, agentId, { id: agentId, name: "..." });

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
    if (!this.loadedUsers[userId]) {
      Vue.set(this.loadedUsers, userId, { name: "loading..." });

      (async () => {
        this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
      })();
    }

    return this.loadedUsers[userId];
  }

  private async onTeamEditableChanged(script: Script) {
    try {
      await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {
        script: { id: script.id, teamEditable: script.teamEditable },
      });
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script saved`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors("Error saving the script", err);
    }
  }

  private onScriptPicked(script: Script) {
    this.script = script; // will also update the scriptCopy
  }

  @Watch("scriptCopy")
  private onScriptCopyChanged() {
    if (this.script) {
      this.scriptId = this.script.id;

      // Update the browser's url for the newly selected script
      if (!this.$router.currentRoute.params["scriptId"] !== this.scriptId) {
        this.$router.replace({ name: "interactiveConsole", params: { scriptId: this.scriptId } });
      }
    } else {
      this.scriptId = null;
    }
  }

  @Watch('latestRanJobId')
  private async onICJobRun (id: string): Promise<void> {
    this.isJobRunning = true;
    const job = await this.$store.dispatch(`${StoreType.JobStore}/fetchModel`, id);
    this.$store.dispatch(`${StoreType.JobStore}/select`, job);

    await this.$nextTick();

    try {
      document.getElementById('ic-results-tab').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      showErrors('Error showing the "Script Results" tab', err);
    } finally {
      this.isJobRunning = false;
    }
  }

  private async onRunScript() {
    if (!(await (<any>this.$refs.runScriptValidationObserver).validate())) {
      return;
    }

    if (!this.scriptShadow) {
      console.error("Script shadow was not loaded so it could not be run.");
      return;
    }

    const icJobSettings: ICJobSettings = {
      scriptType: ScriptType[this.scriptCopy.scriptType] as any as ScriptType,
      code: this.scriptShadowCopy.shadowCopyCode,
      runScriptCommand: this.runScriptCommand,
      runScriptArguments: this.runScriptArguments,
      runScriptEnvVars: this.runScriptEnvVars,
      runAgentTarget: this.runAgentTarget,
      runScriptRuntimeVars: this.runScriptRuntimeVars,
      runAgentTargetTags_string: this.runAgentTargetTags_string,
      runAgentTargetAgentId: this.runAgentTargetAgentId,
    };

    if (this.scriptTarget === ScriptTarget.LAMBDA) {
      Object.assign(icJobSettings, {
        runAgentTarget: TaskDefTarget.AWS_LAMBDA,
        lambdaDependencies: this.lambdaDependencies,
        lambdaMemory: this.lambdaMemory,
        lambdaRuntime: this.lambdaRuntime,
        lambdaTimeout: this.lambdaTimeout,
      });
    }

    try {
      this.isJobRunning = true;
      const data = await this.$store.dispatch(`${StoreType.JobStore}/runICJob`, icJobSettings);
      this.latestRanJobId = data.id;
    } catch (err) {
      this.isJobRunning = false;

      console.error(err);
      showErrors('Error running the script', err);
    } finally {
      this.$modal.hide('run-script-options');
    }
  }

  private async onCancelJobClicked() {
    try {
      await axios.post(`api/v0/jobaction/cancel/${this.selectedJob.id}`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Job cancelled`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors("Error cancelling job", err);
    }
  }

  private async onCancelTaskOutcomeClicked(taskOutcome: TaskOutcome) {
    try {
      await axios.post(`/api/v0/taskoutcomeaction/cancel/${taskOutcome.id}`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Task cancelled`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors("Error cancelling task", err);
    }
  }

  private onClickedJob(job: Job) {
    const routeData = this.$router.resolve({ name: "jobDetailsMonitor", params: { jobId: job.id } });
    window.open(routeData.href, "_blank");
  }

  private async onScheduleScriptClicked() {
    if (this.script) {
      try {
        const {
          data: { data },
        } = await axios.post(`/api/v0/jobdef/script/`, { _scriptId: this.script.id });
        const routeData = this.$router.resolve({
          name: "jobDesigner",
          params: { jobId: data.id, tabName: "schedule" },
        });
        window.open(routeData.href, "_blank");
      } catch (err) {
        console.error(err);
        showErrors("Error scheduling script", err);
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

.v--modal-overlay[data-modal="script-editor-fullscreen"] {
  background: white;
}

.validation-error {
  margin-top: 3px;
  margin-bottom: 3px;
  padding-left: 3px;
  padding-right: 3px;
  color: $danger;
  font-size: 18px;
}

:deep(.vue-tablist) {
  padding-left: 64px;
  padding-right: 64px;
}

.script-run-spinner {
  @include loader;

  display: inline-block;
}
</style>
