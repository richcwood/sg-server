<template>
  <div>

    <!-- Modals -->
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
                 v-html="'<pre>' + stepOutcomeRunCodeBase64Decoded + '</pre>'"></div>
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

    <table class="table" style="margin-left: 10px;">
      <thead class="thead" style="font-weight: 700;">
        <td class="td">Agent Name</td>
        <td class="td">Status</td>
        <td class="td">Failure</td>
        <td class="td">Actions</td>
        <td class="td">Started</td>
        <td class="td">Completed</td>
      </thead>

      <tbody class="tbody">
        <template v-for="taskOutcome in getTaskOutcomes()">
          <tr class="tr" v-bind:key="taskOutcome.id+'main'">
            <td class="td" v-if="taskOutcome.target == TaskDefTarget.AWS_LAMBDA">SG Compute</td>
            <td class="td" v-else>{{getAgentName(taskOutcome._agentId)}}</td>
            <td class="td">{{enumKeyToPretty(TaskStatus, taskOutcome.status)}}</td>
            <td class="td">{{enumKeyToPretty(TaskFailureCode, taskOutcome.failureCode)}}</td>
            <td class="td">
              <template v-if="taskOutcome.status < TaskStatus.CANCELING || taskOutcome.status === TaskStatus.FAILED">
                <button class="button button-spaced" @click="onCancelTaskOutcomeClicked(taskOutcome)">Cancel</button>
              </template>
              <template v-if="taskOutcome.status == TaskStatus.RUNNING">
                <button class="button button-spaced" @click="onInterruptTaskOutcomeClicked(taskOutcome)">Interrupt</button>
              </template>
              <template v-if="taskOutcome.status == TaskStatus.INTERRUPTED || (taskOutcome.status == TaskStatus.FAILED && (taskOutcome.failureCode == TaskFailureCode.AGENT_EXEC_ERROR || taskOutcome.failureCode == TaskFailureCode.LAUNCH_TASK_ERROR || taskOutcome.failureCode == TaskFailureCode.TASK_EXEC_ERROR ))">
                <button class="button button-spaced" @click="onRestartTaskOutcomeClicked(taskOutcome)">Restart</button>
              </template>
              <template v-else>
                none
              </template>
            </td>
            <td class="td">{{momentToStringV1(taskOutcome.dateStarted)}}</td>
            <td class="td">{{momentToStringV1(taskOutcome.dateCompleted)}}</td>
          </tr>
          <tr class="tr" v-bind:key="taskOutcome.id+'steps'">
            <td class="td" colspan="4">
              <table class="table" style="margin-left: 10px;">
                <tbody class="tbody">
                  <template v-for="stepOutcome in getStepOutcomes(taskOutcome)">
                    <tr class="tr" v-bind:key="'one_'+stepOutcome.id">
                      <td class="td" style="padding-bottom: 0px;">{{stepOutcome.name}}</td>
                      <td class="td" style="padding-bottom: 0px;">{{stepOutcome && enumKeyToPretty(TaskStatus, stepOutcome.status)}}</td>
                      <td class="td" style="padding-bottom: 0px;">{{momentToStringV1(stepOutcome.dateStarted)}}</td>
                      <td class="td" style="padding-top: 0px;">
                        <span class="spaced" style="margin-bottom: -5px;"><a @click.prevent="onShowScriptClicked(stepOutcome)">script</a></span>
                        <span class="spaced"><a @click.prevent="onShowStdoutClicked(stepOutcome)">stdout</a></span>
                        <span class="spaced"><a @click.prevent="onShowStderrClicked(stepOutcome)">stderr</a></span>
                      </td>
                    </tr>
                    <tr v-bind:key="'two_'+stepOutcome.id">
                      <td class="td" style="padding-top: 0px; text-align:right;">
                        stdout tail>
                      </td>
                      <td class="td" style="padding-top: 0px;" colspan="3">
                        <div v-if="stepOutcome.tail && stepOutcome.tail.length > 4">
                          {{formatTailRow(stepOutcome.tail[4])}}
                        </div>
                        <div v-if="stepOutcome.tail && stepOutcome.tail.length > 3">
                          {{formatTailRow(stepOutcome.tail[3])}}
                        </div>
                        <div v-if="stepOutcome.tail && stepOutcome.tail.length > 2">
                          {{formatTailRow(stepOutcome.tail[2])}}
                        </div>
                        <div v-if="stepOutcome.tail && stepOutcome.tail.length > 1">
                          {{formatTailRow(stepOutcome.tail[1])}}
                        </div>
                        <div v-if="stepOutcome.tail && stepOutcome.tail.length > 0">
                          {{formatTailRow(stepOutcome.tail[0])}}
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { Agent } from '@/store/agent/types';
import { LinkedModel, StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { Task } from '@/store/task/types';
import { TaskOutcome } from '@/store/taskOutcome/types';
import { JobStatus, TaskStatus, StepStatus, TaskFailureCode, enumKeyToPretty } from '@/utils/Enums.ts';
import axios from 'axios';
import { showErrors } from '@/utils/ErrorHandler';
import { TaskDefTarget } from "@/store/taskDef/types";
import { momentToStringV1 } from '@/utils/DateTime';
import { StepOutcome } from '../store/stepOutcome/types';
import { BindStoreModel } from '@/decorator';

@Component
export default class TaskMonitorDetails extends Vue {

  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly TaskStatus = TaskStatus;
  private readonly StepStatus = StepStatus;
  private readonly TaskFailureCode = TaskFailureCode;
  private readonly enumKeyToPretty = enumKeyToPretty;
  private readonly TaskDefTarget = TaskDefTarget;

  @Prop({default: ''})
  private filterTaskOutcomeStatus!: string;

  @Prop({default: ''})
  private filterTaskOutcomeAgent!: string;

  @Prop({default: ''})
  private filterStepOutcome!: string;

  @Prop()
  private selectedTaskId!: string;

  @Prop()
  private selectedJobId!: string;

  private getTaskOutcomes(): TaskOutcome[]{
    let taskOutcomes: TaskOutcome[];

    if(this.selectedTaskId){
      taskOutcomes = this.$store.getters[`${StoreType.TaskOutcomeStore}/getByTaskId`](this.selectedTaskId);
    }
    else if(this.selectedJobId){
      taskOutcomes = this.$store.getters[`${StoreType.TaskOutcomeStore}/getByJobId`](this.selectedJobId);
    }
    else {
      console.warn('Did you forget to specify a selectedTaskId or a selectedJobId?');
      return [];
    }

    const filterStatus = this.filterTaskOutcomeStatus.trim().toUpperCase();
    const filterAgent = this.filterTaskOutcomeAgent.trim().toUpperCase();
    let returnTaskOutcomes: TaskOutcome[];

    if(filterStatus || filterAgent){
      returnTaskOutcomes = taskOutcomes.filter((taskOutcome: TaskOutcome) => {
        if(filterStatus){
          const taskOutcomeStatusPretty = enumKeyToPretty(TaskStatus, taskOutcome.status).toUpperCase();
          if(taskOutcomeStatusPretty.indexOf(filterStatus) !== -1){
            return true;
          }
        }

        if(filterAgent){
          const agentNameToUpper = this.getAgentName(taskOutcome._agentId).toUpperCase();
          if(agentNameToUpper.indexOf(filterAgent) !== -1){
            return true;
          }
        }
        
        return false;
      })
    }
    else {
      returnTaskOutcomes = taskOutcomes;
    }

    returnTaskOutcomes.sort((a: TaskOutcome, b: TaskOutcome) => {
      return a.id.localeCompare(b.id);
    });

    return returnTaskOutcomes;
  } 

  // make a reactive property
  private loadedAgents: {[key: string]: Agent} = {};
  private getAgentName(agentId: string){
    if(!this.loadedAgents[agentId]){
      Vue.set(this.loadedAgents, agentId, {id: agentId, name: '...'});

      (async () => {
        const agent = await this.$store.dispatch(`${StoreType.AgentStore}/fetchModel`, agentId);
        this.loadedAgents[agentId] = agent;
      })();
    }

    return this.loadedAgents[agentId].name;
  }

  private async onCancelTaskOutcomeClicked(taskOutcome: TaskOutcome){
    try {
      await axios.post(`/api/v0/taskoutcomeaction/cancel/${taskOutcome.id}`);
    }
    catch(err){
      console.error(err);
      showErrors(`Error cancelling the task`, err);
    }
  }

  private async onInterruptTaskOutcomeClicked(taskOutcome: TaskOutcome){
    try {
      await axios.post(`/api/v0/taskoutcomeaction/interrupt/${taskOutcome.id}`);
    }
    catch(err){
      console.error(err);
      showErrors(`Error interrupting the task`, err);
    }
  }

  private async onRestartTaskOutcomeClicked(taskOutcome: TaskOutcome){
    try {
      await axios.post(`/api/v0/taskoutcomeaction/restart/${taskOutcome.id}`);
    }
    catch(err){
      console.error(err);
      showErrors(`Error restarting the task`, err);
    }
  }

  private getStepOutcomes(taskOutcome: TaskOutcome): StepOutcome[] {
    const stepOutcomes = this.$store.getters[`${StoreType.StepOutcomeStore}/getByTaskOutcomeId`](taskOutcome.id);
    const filterStepOutcome = this.filterStepOutcome.trim().toUpperCase();
  
    if(filterStepOutcome){
      return stepOutcomes.filter((stepOutcome: StepOutcome) => {
        return stepOutcome.name.toUpperCase().indexOf(filterStepOutcome) !== -1;
      }).sort((a: StepOutcome, b: StepOutcome) => {
        return a.id.localeCompare(b.id);
      });
    }
    else {
      return stepOutcomes;
    }
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

  private formatStdString(std: string|undefined): string {
    if(std){
      return std.replace(/</g, "&#60;").replace(/>/g, "&#62;").split('\n').reverse().join('<br>');
    }
    else {
      return '';
    }
  }

  private formatTailRow(tailRow: string): string {
    if(tailRow && tailRow.trim()){
      tailRow = tailRow.trim();

      if(tailRow.length > 60){
        tailRow = tailRow.substring(0, 57) + '...';
      }

      return tailRow;
    }
    else {
      return '';
    }
  }

  private get stepOutcomeRunCodeBase64Decoded(){
    if(this.stepOutcomeForPopup && this.stepOutcomeForPopup.runCode){
      return atob(this.stepOutcomeForPopup.runCode);
    }
    else {
      return '';
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
table {
  border-width: 0;
}

td {
  border-width: 0 !important;
}

.button-spaced {
  margin-left: 12px;
}

.spaced {
  margin-left: 14px;
  margin-right: 14px;
  text-align: center;
  line-height: 36px;
}

</style>
