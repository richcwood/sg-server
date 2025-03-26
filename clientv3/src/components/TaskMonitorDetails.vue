<template>
  <table class="table steps-table">
    <thead>
      <th>Agent Name</th>
      <th>Status</th>
      <th>Failure</th>
      <th>Actions</th>
      <th>Started</th>
      <th>Completed</th>
    </thead>

    <tbody class="is-family-code">
      <template v-for="taskOutcome in getTaskOutcomes()">
        <tr :key="taskOutcome.id+'main'" class="has-text-white">
          <td v-if="taskOutcome.target == TaskDefTarget.AWS_LAMBDA">SG Compute</td>
          <td v-else>{{getAgentName(taskOutcome._agentId)}}</td>
          <td>{{enumKeyToPretty(TaskStatus, taskOutcome.status)}}</td>
          <td>{{enumKeyToPretty(TaskFailureCode, taskOutcome.failureCode)}}</td>
          <td>
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
          <td>{{momentToStringV1(taskOutcome.dateStarted)}}</td>
          <td>{{momentToStringV1(taskOutcome.dateCompleted)}}</td>
        </tr>
        <tr :key="taskOutcome.id+'steps'">
          <td colspan="6">
            <table class="steps-table">
              <tbody class="has-text-emerland">
                <template v-for="stepOutcome in getStepOutcomes(taskOutcome)">
                  <tr :key="'one_'+stepOutcome.id">
                    <td class="has-text-carrot">{{stepOutcome.name}}</td>
                    <td :class="getStatusColor(stepOutcome)">{{stepOutcome && enumKeyToPretty(TaskStatus, stepOutcome.status)}}</td>
                    <td>{{momentToStringV1(stepOutcome.dateStarted)}}</td>
                    <td>
                      <a href="#" class="mr-4" @click.prevent="onShowScriptClicked(stepOutcome)">script</a>
                      <a href="#" class="mr-4" @click.prevent="onShowStdoutClicked(stepOutcome)">stdout</a>
                      <a href="#" @click.prevent="onShowStderrClicked(stepOutcome)">stderr</a>
                    </td>
                  </tr>
                  <tr :key="'two_'+stepOutcome.id">
                    <td class="has-text-white align-top has-text-right">
                      stdout tail>
                    </td>
                    <td colspan="3">
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
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import axios from 'axios';
import _ from 'lodash';

import { TaskStatus, StepStatus, TaskFailureCode, enumKeyToPretty } from '@/utils/Enums';
import ScriptModal from '@/components/monitor/ScriptModal.vue';
import StdoutModal from '@/components/monitor/StdoutModal.vue';
import StderrModal from '@/components/monitor/StderrModal.vue';
import { StepOutcome } from '../store/stepOutcome/types';
import { TaskOutcome } from '@/store/taskOutcome/types';
import { TaskDefTarget } from "@/store/taskDef/types";
import { momentToStringV1 } from '@/utils/DateTime';
import { showErrors } from '@/utils/ErrorHandler';
import { Agent } from '@/store/agent/types';
import { StoreType } from '@/store/types';

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

  private onShowScriptClicked (stepOutcome: StepOutcome) {
    this.$modal.show(ScriptModal, { stepOutcome: stepOutcome }, { height: 'auto' });
  }

  private onShowStdoutClicked (stepOutcome: StepOutcome) {
    this.$modal.show(StdoutModal, { stepOutcome: stepOutcome }, { height: 'auto' });
  }

  private onShowStderrClicked (stepOutcome: StepOutcome) {
    this.$modal.show(StderrModal, { stepOutcome: stepOutcome }, { height: 'auto' });
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

  getStatusColor ({ status = StepStatus.NOT_STARTED }: StepOutcome): string {
    switch (status) {
      case StepStatus.FAILED:
          return 'has-text-danger';

      case StepStatus.NOT_STARTED:
      case StepStatus.INTERRUPTED:
      case StepStatus.CANCELLED:
          return 'has-text-warning';

      case StepStatus.RUNNING:
      case StepStatus.SUCCEEDED:
      default:
        return 'has-text-success';
    }
  }
}
</script>

<style scoped lang="scss">
  .table {
    &.steps-table {
      border-collapse: collapse;
      border-spacing: 0;

      tr {
        background: var(--code-background-color);
      }
    }

    tbody {
      td {
        vertical-align: middle;
      }

      td.align-top {
        vertical-align: top;
      }

      tr {
        &:first-child {
          td:first-child {
              border-top-left-radius: 8px;
              border-bottom-left-radius: 0 !important;
          }

          td:last-child {
              border-top-right-radius: 8px;
              border-bottom-right-radius: 0 !important;
          }
        }

        &:last-child {
          td:first-child {
              border-bottom-left-radius: 8px;
              border-top-left-radius: 0 !important;
          }

          td:last-child {
              border-bottom-right-radius: 8px;
              border-top-right-radius: 0 !important;
          }
        }
      }
    }
  }

.button-spaced {
  margin-left: 12px;
}
</style>
