<template>
  <div class="sg-container-p">

    <!-- Modals -->
    <modal name="runtime-vars-modal" :classes="'round-popup'" :width="800" :height="750">
      <table class="table" width="100%" height="100%" v-if="taskToShowRuntimeVars">
        <tr>
          <td>
            <div class="container ml-3 my-3">
              <div class="columns is-desktop is-vcentered">
                <strong>Runtime vars for task: {{taskToShowRuntimeVars.name}}</strong>
                <div v-if="hideSensitiveRuntimeVars" style="display: inline">
                  <button class="button ml-4" @click="toggleHideSensitiveRuntimeVars">Show Sensitive Values</button>
                </div>
                <div v-else style="display: inline">
                  <button class="button ml-4" @click="toggleHideSensitiveRuntimeVars">Hide Sensitive Values</button>
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <div v-if="taskToShowRuntimeVars.runtimeVars" 
                 style="overflow: scroll; width: 750px; height: 525px;">
              <table class="table">
                <tr v-for="runtimeVarKey in Object.keys(taskToShowRuntimeVars.runtimeVars)" v-bind:key="runtimeVarKey">
                  <td>{{runtimeVarKey}}</td>
                  <td> = </td>
                  <td v-if="hideSensitiveRuntimeVars && taskToShowRuntimeVars.runtimeVars[runtimeVarKey]['sensitive']">**{{runtimeVarKey}}**</td>
                  <td v-else>{{taskToShowRuntimeVars.runtimeVars[runtimeVarKey]['value']}}</td>
                </tr>
              </table>     
            </div>
            <div v-else>
              No runtime vars {{taskToShowRuntimeVars.runtimeVars}}
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <button class="button" @click="onCloseRuntimeVarsModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>

    <modal name="inbound-routes-modal" :classes="'round-popup'" :width="800" :height="650">
      <table class="table" width="100%" height="100%" v-if="taskToShowInboundRoutes">
        <tr class="tr">
          <td>
            <strong>Inbound Routes for task: {{taskToShowInboundRoutes.name}}</strong>
          </td>
        </tr>
        <tr class="tr">
          <td>
            <div v-if="taskToShowInboundRoutes.fromRoutes" 
                 style="overflow: scroll; width: 750px; height: 525px;">
              <table class="table">
                <tr class="tr" v-for="fromRoute in taskToShowInboundRoutes.fromRoutes" v-bind:key="fromRoute[0]">
                  <td>{{fromRoute[0]}}</td>
                  <td> | </td>
                  <td>
                    <span v-if="fromRoute.length > 1">
                      {{fromRoute[1]}}
                    </span>
                  </td>
                </tr>
              </table>     
            </div>
            <div v-else>
              No inbound routes
            </div>
          </td>
        </tr>
        <tr class="tr">
          <td>
            <button class="button" @click="onCloseInboundRoutesModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>

    <modal name="outbound-routes-modal" :classes="'round-popup'" :width="800" :height="650">
      <table class="table" width="100%" height="100%" v-if="taskToShowOutboundRoutes">
        <tr class="tr">
          <td>
            <strong>Outbound Routes for task: {{taskToShowOutboundRoutes.name}}</strong>
          </td>
        </tr>
        <tr class="tr">
          <td>
            <div v-if="taskToShowOutboundRoutes.toRoutes" 
                 style="overflow: scroll; width: 750px; height: 525px;">
              <table class="table">
                <tr class="tr" v-for="toRoute in taskToShowOutboundRoutes.toRoutes" v-bind:key="toRoute[0]">
                  <td>{{toRoute[0]}}</td>
                  <td> | </td>
                  <td>
                    <span v-if="toRoute.length > 1">
                      {{toRoute[1]}}
                    </span>
                  </td>
                </tr>
              </table>     
            </div>
            <div v-else>
              No outbound routes
            </div>
          </td>
        </tr>
        <tr class="tr">
          <td>
            <button class="button" @click="onCloseOutboundRoutesModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>

    <modal name="artifacts-modal" :classes="'round-popup'" :width="800" :height="650">
      <table class="table" width="100%" height="100%" v-if="taskToShowArtifacts">
        <tr class="tr">
          <td>
            <strong>Artifacts for task: {{taskToShowArtifacts.name}}</strong>
          </td>
        </tr>
        <tr class="tr">
          <td>
            <div v-if="taskToShowArtifacts.artifacts" 
                 style="overflow: scroll; width: 750px; height: 525px;">
              <table class="table">
                <tr class="tr" v-for="artifactName in getArtifactNames(taskToShowArtifacts)" v-bind:key="artifactName">
                  <td>{{artifactName}}</td>
                </tr>
              </table>     
            </div>
            <div v-else>
              No artifacts
            </div>
          </td>
        </tr>
        <tr class="tr">
          <td>
            <button class="button" @click="onCloseArtifactsModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>


    <div class="box is-inline-block mb-5">
      <h2 class="title is-size-4">Job Details: {{ filterTaskOutcomeStatus }}</h2>
      <table class="table">
        <tbody>
          <tr>
            <td class="has-text-weight-bold has-text-dark">Job Name</td>
            <td>
              <template v-if="selectedJob._jobDefId">
                <router-link :to="{name: 'jobDesigner', params: {jobId: selectedJob._jobDefId}}">{{selectedJob.name}}</router-link>
              </template>
              <template v-else>
                {{selectedJob.name}}
              </template>
            </td>
            <td class="px-6"></td>
            <td class="has-text-weight-bold has-text-dark">Status</td>
            <td>
              {{enumKeyToPretty(JobStatus, selectedJob.status)}}
              <template v-if="selectedJob.status < JobStatus.CANCELING || selectedJob.status === JobStatus.FAILED">
                <button class="button button-spaced" @click="onCancelJobClicked(selectedJob)">Cancel</button>
              </template>
              <template v-if="selectedJob.status == TaskStatus.RUNNING">
                <button class="button button-spaced" @click="onInterruptJobClicked(selectedJob)">Interrupt</button>
              </template>
              <template v-if="selectedJob.status == TaskStatus.INTERRUPTED || selectedJob.status == TaskStatus.FAILED">
                <button class="button button-spaced" @click="onRestartJobClicked(selectedJob)">Restart</button>
              </template>
            </td>
          </tr>
          <tr>
            <td class="has-text-weight-bold has-text-dark">Run Number</td>
            <td>{{selectedJob.runId}}</td>
            <td class="px-6"></td>
            <td class="has-text-weight-bold has-text-dark">Error</td>
            <td>{{selectedJob.error}}</td>
          </tr>
          <tr>
            <td class="has-text-weight-bold has-text-dark">Started</td>
            <td>{{momentToStringV1(selectedJob.dateStarted)}}</td>
            <td class="px-6"></td>
            <td class="has-text-weight-bold has-text-dark">Completed</td>
            <td>{{momentToStringV1(selectedJob.dateCompleted)}}</td>
          </tr>
          <tr>
            <td class="has-text-weight-bold has-text-dark">Created By</td>
            <td>{{getUser(selectedJob.createdBy, selectedJob.name).name}}</td>
            <td class="px-6"></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
    </div>



    <table class="table is-striped is-hoverable">
      <thead>
        <tr>
          <th>Task Name</th>
          <th>Status</th>
          <th>Task Outcomes</th>
          <th>Failure</th>
          <th>Runtime Vars</th>
          <th>Inbound Routes</th>
          <th>Outbound Routes</th>
          <th>Artifacts</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="tasks.length === 0" class="has-background-white">
          <td colspan="8">
            There are no tasks yet for the job
          </td>
        </tr>
        <tr v-else v-for="task in tasks" v-bind:key="task.id">
          <td><a @click.prevent="onClickedTask(task)">{{task.name}}</a></td>
          <td>{{enumKeyToPretty(TaskStatus, task.status)}}</td>
          <td><span v-html="formatTaskOutcomes(task)"></span></td>
          <td>{{enumKeyToPretty(TaskFailureCode, task.failureCode)}}</td>
          <td><a @click.prevent="onClickedRuntimeVarsSummary(task)" v-html="formatRuntimeVars(task)"></a></td>
          <td><a @click.prevent="onClickedInboundRoutesSummary(task)" v-html="formatInboundRoutes(task)"></a></td>
          <td><a @click.prevent="onClickedOutboundRoutesSummary(task)" v-html="formatOutboundRoutes(task)"></a></td>
          <td><a @click.prevent="onClickedArtifactsSummary(task)" v-html="formatArtifacts(task)"></a></td>
        </tr>
      </tbody>
    </table>

    <template v-if="selectedTask">
      <div class="field is-grouped mb-4">
        <div class="control">
          <input class="input" v-model="filterTaskOutcomeStatus" type="text" placeholder="Filter status" style="width: 150px;"/>
        </div>
        <div class="control">
          <input class="input" v-model="filterTaskOutcomeAgent" type="text" placeholder="Filter agents" style="width: 150px;"/>
        </div>
        <div class="control">
          <input class="input" v-model="filterStepOutcome" type="text" placeholder="Filter steps" style="width: 150px;"/>
        </div>
        <div class="control">
          <a href="#" class="button is-ghost" @click.prevent="onCloseSelectedTaskDetails">Close</a>
        </div>
      </div>

      <task-monitor-details :selectedTaskId="selectedTask.id" 
                            :filterTaskOutcomeStatus="filterTaskOutcomeStatus"
                            :filterTaskOutcomeAgent="filterTaskOutcomeAgent"
                            :filterStepOutcome="filterStepOutcome" >
      </task-monitor-details>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { momentToStringV1 } from '@/utils/DateTime';
import moment from 'moment';
import axios from 'axios';
import { StoreType } from '@/store/types';
import { Job } from '@/store/job/types';
import { Task } from '@/store/task/types';
import { TaskOutcome } from '@/store/taskOutcome/types';
import { TaskDefTarget } from "@/store/taskDef/types";
import { StepOutcome } from '@/store/stepOutcome/types';
import { BindStoreModel } from '@/decorator';
import { JobStatus, TaskStatus, StepStatus, TaskFailureCode, enumKeyToPretty } from '@/utils/Enums';
import { mapToString, truncateString } from '@/utils/Shared';
import { Agent } from "../store/agent/types";
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { User } from '@/store/user/types';
import { showErrors } from '@/utils/ErrorHandler';
import { Artifact } from '@/store/artifact/types';
import { TaskDef } from '../store/taskDef/types';
import TaskMonitorDetails from '../components/TaskMonitorDetails.vue';

@Component({
  components: {
    TaskMonitorDetails
  },
})
export default class JobDetailsMonitor extends Vue {

  private page = 'home';

  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly JobStatus = JobStatus;
  private readonly TaskStatus = TaskStatus;
  private readonly StepStatus = StepStatus;
  private readonly TaskFailureCode = TaskFailureCode;
  private readonly enumKeyToPretty = enumKeyToPretty;
  private readonly mapToString = mapToString;
  private readonly TaskDefTarget = TaskDefTarget;
  private readonly truncateString = truncateString;
  
  private get defaultStoreType(){return StoreType.JobStore};

  private mounted(){
    (<any>window).TaskStatus = TaskStatus;
    (<any>window).TaskFailureCode = TaskFailureCode;
    (<any>window).enumKeyToPretty = enumKeyToPretty;
  }

  @BindStoreModel()
  private selectedJob!: Job;

  @BindStoreModel({storeType: StoreType.TaskStore})
  private selectedTask!: Task|null;

  private beforeDestroy(){
    this.selectedTask = null;
  }

  private get tasks(): Task[] {
    const tasks = this.$store.getters[`${StoreType.TaskStore}/getByJobId`](this.selectedJob.id);
    tasks.sort((a: Task, b: Task) => {
      return a.id.localeCompare(b.id);
    });
    return tasks;
  }

  private formatRuntimeVars(task: Task): string {
    if(task.runtimeVars){
      const runtimeVarKeys = Object.keys(task.runtimeVars);
      const summary = runtimeVarKeys.map(k => (task.runtimeVars[k]['sensitive'] ? `${k}=**${k}**` : `${k}=${task.runtimeVars[k]['value']}`)).join(', ');
      return truncateString(summary, 24);
    }
    else {
      return '';
    }
  }

  private formatInboundRoutes(task: Task): string {
    if(task.fromRoutes){
      let summary = task.fromRoutes.map((route: any) => {
        let returnVal = `${route[0]} | `;
        if(route.length > 1){
          returnVal += route[1];
        }
        return returnVal;
      }).join(', ');

      return truncateString(summary, 24);
    }
    else {
      return '';
    }
  }

  private formatOutboundRoutes(task: Task): string {
    if(task.fromRoutes){
      let summary = task.toRoutes.map((route: any) => {
        let returnVal = `${route[0]} | `;
        if(route.length > 1){
          returnVal += route[1];
        }
        return returnVal;
      }).join(', ');
      
      return truncateString(summary, 24);
    }
    else {
      return '';
    }
  }

  private formatArtifacts(task: Task): string {
    if(task.artifacts){
      const summary = this.getArtifactNames(task).join(', ');
      return truncateString(summary, 24);
    }
    else {
      return '';
    }
  }

  private filterTaskOutcomeStatus = '';
  private filterTaskOutcomeAgent = '';

  private getTaskOutcomes(task: Task): TaskOutcome[]{
    const taskOutcomes = <TaskOutcome[]> this.$store.getters[`${StoreType.TaskOutcomeStore}/getByTaskId`](task.id);

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

  private filterStepOutcome = '';

  private getStepOutcomes(taskOutcome: TaskOutcome): StepOutcome[] {
    const stepOutcomes = this.$store.getters[`${StoreType.StepOutcomeStore}/getByTaskOutcomeId`](taskOutcome.id);
    const filterStepOutcome = this.filterStepOutcome.trim().toUpperCase();
  
    if(filterStepOutcome){
      return stepOutcomes.filter((stepOutcome: StepOutcome) => {
        return stepOutcome.name.toUpperCase().indexOf(filterStepOutcome) !== -1;
      }).sort((a: StepOutcome, b: StepOutcome) => {
        console.log('sortt');
        return a.id.localeCompare(b.id);
      });
    }
    else {
      return stepOutcomes;
    }
  }

  private formatTaskOutcomes(task: Task): string {
    const taskOutcomes = this.getTaskOutcomes(task);
    if(taskOutcomes.length > 0) {
      const statusCounts: any = {};
      // @ts-ignore
      taskOutcomes.map((taskOutcome: TaskOutcome) => {
        if(statusCounts[taskOutcome.status]){
          statusCounts[taskOutcome.status]++;
        }
        else {
          statusCounts[taskOutcome.status] = 1;
        }
      });

      return Object.keys(statusCounts).map((taskStatus: any) => {
        let color;

        switch(taskStatus){
          case ''+TaskStatus.NOT_STARTED: color = 'blue'; break;
          case ''+TaskStatus.WAITING_FOR_AGENT: color = 'red'; break;
          case ''+TaskStatus.PUBLISHED: color = 'blue'; break;
          case ''+TaskStatus.RUNNING: color = 'green'; break;
          case ''+TaskStatus.INTERRUPTING: color = 'red'; break;
          case ''+TaskStatus.INTERRUPTED: color = 'red'; break;
          case ''+TaskStatus.CANCELING: color = 'red'; break;
          case ''+TaskStatus.SUCCEEDED: color = ''; break;
          case ''+TaskStatus.FAILED: color = 'red'; break;
          case ''+TaskStatus.SKIPPED: color = ''; break;
        }

        const prettyStatusName = enumKeyToPretty(TaskStatus, taskStatus);        
        return `<span style="color:${color};">${prettyStatusName}=${statusCounts[taskStatus]}</span>`;
      }).join('<br>');
    }
    else {
      return 'none';
    }
  }

  private onClickedTask(task: Task){
    this.$store.dispatch(`${StoreType.TaskStore}/select`, task);
  }

  private onCloseSelectedTaskDetails(){
    this.$store.dispatch(`${StoreType.TaskStore}/select`, null);
  }

  private formatTail(tail: any): string {
    if(!tail){
      return '';
    }
    else {
      return tail.join('<br>');
    }
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

  private async onCancelJobClicked(job: Job){
    try {
      await axios.post(`/api/v0/jobaction/cancel/${job.id}`);
    }
    catch(err){
      console.error(err);
      showErrors(`Error cancelling the job`, err);
    }
  }

  private async onInterruptJobClicked(job: Job){
    try {
      await axios.post(`/api/v0/jobaction/interrupt/${job.id}`);
    }
    catch(err){
      console.error(err);
      showErrors(`Error interrupting the job`, err);
    }
  }

  private async onRestartJobClicked(job: Job){
    try {
      await axios.post(`/api/v0/jobaction/restart/${job.id}`);
    }
    catch(err){
      console.error(err);
      showErrors(`Error restarting the job`, err);
    }
  }

  // for reactivity in a template
  private loadedUsers = {};
  private getUser(userId: string, jobName: string): User {
    try {
      if(jobName.startsWith('Inactive agent job')) {
        return { 
          name: 'Error',
          email: 'Error',
          teamIdsInvited: [],
          teamIds: [],
          companyName: ''
        };
      } else {
        if(!this.loadedUsers[userId]){
          Vue.set(this.loadedUsers, userId, {name: 'loading...'});

          (async () => {
            this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
          })();
        }

        return this.loadedUsers[userId];
      }
    }
    catch(err){
      console.log('Error in loading a user.  Maybe it was deleted?', userId);
      return {
        name: 'Error',
        email: 'Error',
        teamIdsInvited: [],
        teamIds: [],
        companyName: ''
      }
    }
  }

  private taskToShowRuntimeVars: Task | null = null;
  private onClickedRuntimeVarsSummary(task: Task){
    this.taskToShowRuntimeVars = task;
    this.$modal.show('runtime-vars-modal');
  }

  private onCloseRuntimeVarsModalClicked(){
    this.$modal.hide('runtime-vars-modal');
    this.taskToShowRuntimeVars = null;
    this.hideSensitiveRuntimeVars = true;
  }

  private taskToShowInboundRoutes: Task | null = null;
  private onClickedInboundRoutesSummary(task: Task){
    this.taskToShowInboundRoutes = task;
    this.$modal.show('inbound-routes-modal');
  }

  private onCloseInboundRoutesModalClicked(){
    this.$modal.hide('inbound-routes-modal');
    this.taskToShowInboundRoutes = null;
  }

  private taskToShowOutboundRoutes: Task | null = null;
  private onClickedOutboundRoutesSummary(task: Task){
    this.taskToShowOutboundRoutes = task;
    this.$modal.show('outbound-routes-modal');
  }

  private onCloseOutboundRoutesModalClicked(){
    this.$modal.hide('outbound-routes-modal');
    this.taskToShowOutboundRoutes = null;
  }

  private taskToShowArtifacts: Task | null = null;
  private onClickedArtifactsSummary(task: Task){
    this.taskToShowArtifacts = task;
    this.$modal.show('artifacts-modal');
  }

  private onCloseArtifactsModalClicked(){
    this.$modal.hide('artifacts-modal');
    this.taskToShowArtifacts = null;
  }

  private hideSensitiveRuntimeVars: boolean = true;
  private toggleHideSensitiveRuntimeVars(){
    this.hideSensitiveRuntimeVars = !this.hideSensitiveRuntimeVars;
  }

  private getArtifactNames(task: Task): string[] {
    if(task.artifacts){
      return task.artifacts.map((artifactId: string) => this.getArtifact(artifactId).name);
    } 
    else {
      return [];
    }
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
}
</script>

<style scoped lang="scss">
table {

  // The borders just make things really ugly
  td  {
    border-width: 0 !important;
  }

  td .agent-details {
    margin-left: 30px;
  }

  td .script-tail {
    padding-left: 40px;
  }
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

.tab { 
  margin-left: 40px; 
}
</style>