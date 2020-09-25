<template>
  <div class="home">

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
                 v-html="'<pre>' + stepOutcomeForPopup.runCode + '</pre>'"></div>
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

    <modal name="runtime-vars-modal" :classes="'round-popup'" :width="800" :height="650">
      <table class="table" width="100%" height="100%" v-if="taskToShowRuntimeVars">
        <tr class="tr">
          <td class="td">
            <strong>Runtime vars for task: {{taskToShowRuntimeVars.name}}</strong>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <div v-if="taskToShowRuntimeVars.runtimeVars" 
                 style="overflow: scroll; width: 750px; height: 525px;" 
                 v-html="formatRuntimeVars(taskToShowRuntimeVars.runtimeVars)"></div>
            <div v-else>
              No runtime vars {{taskToShowRuntimeVars.runtimeVars}}
            </div>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="onCloseRuntimeVarsModalClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>

    



    Job Details: {{filterTaskOutcomeStatus}}
    <table class="table">
      <tbody class="tbody">
        <tr class="tr">
          <td class="td">Job Name</td>
          <td class="td">
            <template v-if="selectedJob._jobDefId">
              <router-link :to="{name: 'jobDesigner', params: {jobId: selectedJob._jobDefId}}">{{selectedJob.name}}</router-link>
            </template>
            <template v-else>
              {{selectedJob.name}}
            </template>
          </td>
          <td style="width: 100px"> </td>
          <td class="td">Status</td>
          <td class="td">
            {{enumKeyToPretty(JobStatus, selectedJob.status)}}
            <template v-if="selectedJob.status < JobStatus.CANCELING || selectedJob.status === JobStatus.FAILED">
              <button class="button button-spaced" @click="onCancelJobClicked(selectedJob)">Cancel</button>
            </template>
            <template v-if="selectedJob.status == TaskStatus.RUNNING">
              <button class="button button-spaced" @click="onInterruptJobClicked(selectedJob)">Interrupt</button>
            </template>
            <template v-if="selectedJob.status == TaskStatus.INTERRUPTED">
              <button class="button button-spaced" @click="onRestartJobClicked(selectedJob)">Restart</button>
            </template>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">Run Number</td><td class="td">{{selectedJob.runId}}</td>
          <td style="width: 100px"> </td>
          <td class="td">Error</td><td class="td">{{selectedJob.error}}</td>
        </tr>
        <tr class="tr">
          <td class="td">Started</td><td class="td">{{momentToStringV1(selectedJob.dateStarted)}}</td>
          <td style="width: 100px"> </td>
          <td class="td">Completed</td><td class="td">{{momentToStringV1(selectedJob.dateCompleted)}}</td>
        </tr>
        <tr class="tr">
          <td class="td">Created By</td><td class="td">{{getUser(selectedJob.createdBy).name}}</td>
          <td class="td"></td>
          <td class="td"></td>
        </tr>
      </tbody>
    </table>


     <table class="table">
      <thead class="thead" style="font-weight: 700;">
        <td class="td">Task Name</td>
        <td class="td">Status</td>
        <td class="td">Task Outcomes</td>
        <td class="td">Failure</td>
      </thead>

      <tbody class="tbody">
        <tr v-if="tasks.length === 0">
          <td colspan="9">
            There are no tasks yet for the job
          </td>
        </tr>
        <div v-else v-for="task in tasks" class="tr" v-bind:key="task.id">
          <template v-if="!selectedTask || selectedTask === task">
            <tr class="tr">
              <td class="td"><a @click.prevent="onClickedTask(task)">{{task.name}}</a></td>
              <td class="td">{{enumKeyToPretty(TaskStatus, task.status)}}</td>
              <td class="td">
                <span v-html="formatTaskOutcomes(task)"></span>
              </td>
              <td class="td">{{enumKeyToPretty(TaskFailureCode, task.failureCode)}}</td>
            <tr>
            <tr class="tr">
              <td class="td" colspan="4">
                <table class="table">
                  <tr class="tr">
                    <td class="td">
                      <span style="font-weight: 700;">
                        Error
                      </span>
                    </td>
                    <td class="td">
                      {{task.error}}
                    </td>
                  </tr>
                  <tr class="tr">
                    <td class="td">
                      <span style="font-weight: 700;">
                        Runtime Vars
                      </span>
                    </td>
                    <td class="td">
                      <a v-if="task.runtimeVars && Object.keys(task.runtimeVars).length > 3" 
                          v-html="formatRuntimeVars_summary(task.runtimeVars)"
                          @click.prevent="onClickedRuntimeVarsSummary(task)">
                      </a>
                      <span v-else v-html="formatRuntimeVars_summary(task.runtimeVars)">
                      </span>
                    </td>
                  </tr>
                  <tr class="tr">
                    <td class="td">
                      <span style="font-weight: 700;">
                        Inbound Routes
                      </span>
                    </td>
                    <td class="td">
                      {{task.fromRoutes}}
                    </td>
                  </tr>
                  <tr class="tr">
                    <td class="td">
                      <span style="font-weight: 700;">
                        Outbound Routes
                      </span>
                    </td>
                    <td class="td">
                      {{task.toRoutes}}
                    </td>
                  </tr>
                  <tr class="tr">
                    <td class="td">
                      <span style="font-weight: 700;">
                        Artifacts
                      </span>
                    </td>
                    <td class="td">
                      {{getArtifactNames(task)}}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </template>
        </div>
      </tbody>
    </table>

    <template v-if="selectedTask">
      <div style="margin-bottom: 15px;">
        <input class="input" v-model="filterTaskOutcomeStatus" type="text" placeholder="Filter status" style="width: 150px;"/>
        <input class="input" v-model="filterTaskOutcomeAgent" type="text" placeholder="Filter agents" style="width: 150px; margin-left: 10px;"/>
        <input class="input" v-model="filterStepOutcome" type="text" placeholder="Filter steps" style="width: 150px; margin-left: 10px;"/>
        <a style="margin-left: 10px;" @click.prevent="onCloseSelectedTaskDetails">close</a>
      </div>
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
          <template v-for="taskOutcome in getTaskOutcomes(selectedTask)">
            <tr class="tr" v-bind:key="taskOutcome.id+'main'">
              <td class="td" v-if="taskOutcome.target == TaskDefTarget.AWS_LAMBDA">AWS Lambda</td>
              <td class="td" v-else>{{getAgentName(taskOutcome._agentId)}}</td>
              <td class="td">{{enumKeyToPretty(TaskStatus, taskOutcome.status)}}</td>
              <td class="td">{{enumKeyToPretty(TaskFailureCode, taskOutcome.failureCode)}}</td>
              <td class="td">
                <template v-if="taskOutcome.status < TaskStatus.CANCELING || taskOutcome.status === TaskStatus.FAILED">
                  <button class="button" @click="onCancelTaskOutcomeClicked(taskOutcome)">Cancel</button>
                </template>
                <template v-if="taskOutcome.status == TaskStatus.RUNNING">
                  <button class="button button-spaced" @click="onInterruptTaskOutcomeClicked(taskOutcome)">Interrupt</button>
                </template>
                <template v-if="taskOutcome.status == TaskStatus.INTERRUPTED || (taskOutcome.status == TaskStatus.FAILED && (taskOutcome.failureCode == TaskFailureCode.AGENT_EXEC_ERROR || taskOutcome.failureCode == TaskFailureCode.LAUNCH_TASK_ERROR || taskOutcome.failureCode == TaskFailureCode.TASK_EXEC_ERROR ))">
                  <button class="button button-spaced" @click="onRestartTaskOutcomeClicked(taskOutcome)">Restart</button>
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
                        <td class="td" style="padding-bottom: 0px;">
                          <span class="spaced"><a @click.prevent="onShowScriptClicked(stepOutcome)">script</a></span>
                          <span class="spaced"><a @click.prevent="onShowStdoutClicked(stepOutcome)">stdout</a></span>
                          <span class="spaced"><a @click.prevent="onShowStderrClicked(stepOutcome)">stderr</a></span>
                        </td>
                      </tr>
                      <tr v-bind:key="'two_'+stepOutcome.id">
                        <td class="td" style="padding-top: 0px;">
                        </td>
                        <td class="td" style="padding-top: 0px;" colspan="3">
                          <div v-if="stepOutcome.tail && stepOutcome.tail.length > 4">
                            {{stepOutcome.tail[4]}}
                          </div>
                          <div v-if="stepOutcome.tail && stepOutcome.tail.length > 3">
                            {{stepOutcome.tail[3]}}
                          </div>
                          <div v-if="stepOutcome.tail && stepOutcome.tail.length > 2">
                            {{stepOutcome.tail[2]}}
                          </div>
                          <div v-if="stepOutcome.tail && stepOutcome.tail.length > 1">
                            {{stepOutcome.tail[1]}}
                          </div>
                          <div v-if="stepOutcome.tail && stepOutcome.tail.length > 0">
                            {{stepOutcome.tail[0]}}
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
import { JobStatus, TaskStatus, StepStatus, TaskFailureCode, enumKeyToPretty } from '@/utils/Enums.ts';
import { mapToString } from '@/utils/Shared';
import { Agent } from "../store/agent/types";
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { User } from '@/store/user/types';
import { showErrors } from '@/utils/ErrorHandler';
import { Artifact } from '@/store/artifact/types';
import { TaskDef } from '../store/taskDef/types';

@Component({
  components: {
    
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

  private formatRuntimeVars_summary(runtimeVars: any): string {
    if(runtimeVars){
      const runtimeVarKeys = Object.keys(runtimeVars);
      const moreThanThree = runtimeVarKeys.length > 3;
      let summary = runtimeVarKeys.splice(0, 3).map(k => `${k}=${runtimeVars[k]}`).join('<br>');
      if(moreThanThree){
        summary += ' ...';
      }
      return summary;
    }
    else {
      return '';
    }
  }

  private formatRuntimeVars(runtimeVars: any): string {
    if(runtimeVars){
      return Object.keys(runtimeVars).map(k => `${k}=${runtimeVars[k]}`).join('<br>');
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
      const statusCounts:any = {};
      // @ts-ignore
      taskOutcomes.map((to: TaskOutcome) => {
        const prettyStatusName = enumKeyToPretty(TaskStatus, to.status);
        if(statusCounts[prettyStatusName]){
          statusCounts[prettyStatusName]++;
        }
        else {
          statusCounts[prettyStatusName] = 1;
        }
      });

      return Object.keys(statusCounts).map(k => `${k}=${statusCounts[k]}`).join('<br>');
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
D
  private formatStdString(std: string|undefined): string {
    if(std){
      return std.split('\n').reverse().join('<br>');
    }
    else {
      return '';
    }
  }

  // for reactivity in a template
  private loadedUsers = {};
  private getUser(userId: string): User {
    try {
      if(!this.loadedUsers[userId]){
        Vue.set(this.loadedUsers, userId, {name: 'loading...'});

        (async () => {
          this.loadedUsers[userId] = await this.$store.dispatch(`${StoreType.UserStore}/fetchModel`, userId);
        })();
      }

      return this.loadedUsers[userId];
    }
    catch(err){
      console.log('Error in loading a user.  Maybe it was deleted?', userId);
      return {
        name: 'Error',
        email: 'Error'
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
.home {
  margin-left: 12px;
}

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