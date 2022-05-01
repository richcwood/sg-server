 <template>
  <div class="sg-container-p">
    <div class="tile is-ancestor">
      <div class="tile is-parent">
        <div class="tile is-child box">
          <div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
            <span class="is-flex">
              <img class="mr-3" src="@/assets/images/job-run-icon.svg" width="40" />
              <h2 class="is-size-3 has-text-weight-bold has-text-dark">Job Runs</h2>
            </span>
            <router-link :to="{name: 'jobList', params: {action: 'create'}}">Create</router-link>
          </div>

          <template v-if="filteredJobs">
            <p class="is-size-6 py-1">
              <font-awesome-icon :icon="['fas', 'calendar-alt']" />
              {{getJobFetchTypeDescription(selectedJobFetchType)}}
            </p>

            <div class="field is-grouped is-grouped-multiline mt-3">
              <div class="control">
                <div class="tags has-addons">
                  <router-link class="tag is-light is-success" to="/jobMonitor">Total</router-link>
                  <span class="tag is-success">{{filteredJobs.length}}</span>
                </div>
              </div>

              <div class="control">
                <div class="tags has-addons">
                  <router-link class="tag is-light is-success" to="/jobMonitor">Completed</router-link>
                  <span class="tag is-success">{{filteredJobsStatusCounts[JobStatus.COMPLETED]}}</span>
                </div>
              </div>

              <div class="control">
                <div class="tags has-addons">
                  <router-link class="tag is-light is-info" to="/jobMonitor">Running</router-link>
                  <span class="tag is-info">{{filteredJobsStatusCounts[JobStatus.RUNNING]}}</span>
                </div>
              </div>

              <div class="control">
                <div class="tags has-addons">
                  <router-link class="tag is-light is-warning" to="/jobMonitor">Not Started</router-link>
                  <span class="tag is-warning">{{filteredJobsStatusCounts[JobStatus.NOT_STARTED]}}</span>
                </div>
              </div>

              <div class="control">
                <div class="tags has-addons">
                  <router-link class="tag is-light is-warning" to="/jobMonitor">Cancelling</router-link>
                  <span class="tag is-warning">{{filteredJobsStatusCounts[JobStatus.CANCELING]}}</span>
                </div>
              </div>

              <div class="control">
                <div class="tags has-addons">
                  <router-link class="tag is-light is-warning" to="/jobMonitor">Interupting</router-link>
                  <span class="tag is-warning">{{filteredJobsStatusCounts[JobStatus.INTERRUPTING]}}</span>
                </div>
              </div>

              <div class="control">
                <div class="tags has-addons">
                  <router-link class="tag is-light is-danger" to="/jobMonitor">Interupted</router-link>
                  <span class="tag is-danger">{{filteredJobsStatusCounts[JobStatus.INTERRUPTED]}}</span>
                </div>
              </div>
            </div>

            <p class="is-size-6 has-text-weight-bold mt-4 mb-1">Recent Job Runs (up to 5 shown)</p>

            <table class="table is-striped is-fullwidth">
              <thead>
                <tr>
                <th>Run Number</th>
                <th>Name</th>
                <th>Status</th>
                <th>Started</th>
                <th>Completed</th>
              </tr>
              </thead>
              <tbody class="is-size-7 is-size-6-fullhd">
                <tr v-for="job in recentJobs" :key="job.id">
                  <td><router-link :to="{name: 'jobDetailsMonitor', params: {jobId: job.id}}">Monitor {{job.runId}}</router-link></td>
                  <td>
                    <template v-if="job._jobDefId">
                      <router-link :to="{name: 'jobDesigner', params: {jobId: job._jobDefId}}">{{job.name}}</router-link>
                    </template>
                    <template v-else>
                      {{job.name}}
                    </template>
                  </td>
                  <td :style="{color: calcJobStatusColor(job.status)}" >{{enumKeyToPretty(JobStatus, job.status)}}</td>
                  <td>{{momentToStringV1(job.dateStarted)}}</td>
                  <td>{{momentToStringV1(job.dateCompleted)}}</td>
                </tr>
              </tbody>
            </table>

            <p class="is-size-6 has-text-weight-bold mt-4 mb-1">Scheduled Job Runs (Next 24 Hours)</p>

            <table class="table is-striped is-fullwidth">
              <tbody class="is-size-7 is-size-6-fullhd">
                <tr v-for="schedule in schedulesNext24Hours" :key="schedule.id">
                  <td>{{momentToStringV1(schedule.nextScheduledRunDate)}}</td>
                  <td>
                    <a href="#" @click.prevent="onClickedSchedule(schedule)">{{getJobName(schedule)}}</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
          <p v-else class="has-text-centered is-size-5 mt-5">
            No Jobs yet.<br /> <router-link :to="{name: 'jobList', params: {action: 'create'}}">Create</router-link> your first Job.
          </p>
        </div>
      </div>

      <div class="tile is-vertical">
        <div class="tile is-flex-grow-0">
          <div class="tile is-parent">
            <div class="tile is-child box">
              <div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
                <span class="is-flex">
                  <img class="mr-3" src="@/assets/images/job-icon.svg" width="40"/>
                  <h2 class="is-size-3 has-text-weight-bold has-text-dark">Jobs</h2>
                </span>
                <router-link :to="{name: 'jobList', params: {action: 'create'}}">Create</router-link>
              </div>

              <template v-if="jobDefs && jobDefs.length !== 0">
                <div class="tags has-addons mb-1">
                  <router-link class="tag is-light is-success" to="/jobList">Total</router-link>
                  <span class="tag is-success">{{ jobDefs.length }}</span>
                </div>
                <div class="tags has-addons mb-1">
                  <router-link class="tag is-light is-success" to="/jobList">Active</router-link>
                  <span class="tag is-success">{{runningJobDefs ? runningJobDefs.length : 0}}</span>
                </div>
                <div class="tags has-addons">
                  <router-link class="tag is-light is-warning" to="/jobList">Paused</router-link>
                  <span class="tag is-warning">{{pausedJobDefs ? pausedJobDefs.length : 0}}</span>
                </div>
              </template>
              <p v-else class="has-text-centered is-size-5">
                No Jobs yet.<br /> <router-link :to="{name: 'jobList', params: {action: 'create'}}">Create</router-link> your first Job.
              </p>

            </div>
          </div>

          <div class="tile is-parent">
            <div class="tile is-child box">
              <div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
                <span class="is-flex">
                  <img class="mr-3" src="@/assets/images/step-icon.svg" width="40"/>
                  <h2 class="is-size-3 has-text-weight-bold has-text-dark">Scripts</h2>
                </span>
                <router-link :to="{name: 'scripts', params: {action: 'create'}}">Create</router-link>
              </div>

              <div v-if="scripts && scripts.length !== 0" class="tags has-addons">
                <router-link class="tag is-light is-success" to="/scripts">Total</router-link>
                <span class="tag is-success">{{ scripts.length }}</span>
              </div>
              <p v-else class="has-text-centered is-size-5">
                No Scripts yet.<br /> <router-link :to="{name: 'scripts', params: {action: 'create'}}">Create</router-link> your first Script.
              </p>

            </div>
          </div>
        </div>

        <div class="tile is-parent">
          <div class="tile is-child box">
            <div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
              <span class="is-flex">
                <img class="mr-3" src="@/assets/images/agent.svg" width="40"/>
                <h2 class="is-size-3 has-text-weight-bold has-text-dark">Agents</h2>
              </span>
              <router-link to="/downloadAgent">Create</router-link>
            </div>

            <template v-if="agents && agents.length !== 0">
              <div class="field is-grouped is-grouped-multiline">
                <div class="control">
                  <div class="tags has-addons">
                    <router-link class="tag is-light is-success" to="/agentMonitor">Total</router-link>
                    <span class="tag is-success">{{ agents.length }}</span>
                  </div>
                </div>

                <div class="control">
                  <div class="tags has-addons">
                    <router-link class="tag is-light is-success" to="/agentMonitor">Active</router-link>
                    <span class="tag is-success">{{activeAgents ? activeAgents.length : 0}}</span>
                  </div>
                </div>
              </div>

              <p class="is-size-6 has-text-weight-bold mt-4 mb-1">Active Agents (up to 5 shown)</p>

              <table class="table is-striped is-fullwidth">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Tags</th>
                    <th>Num Running Tasks</th>
                    <th>Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody class="is-size-7 is-size-6-fullhd">
                  <tr v-for="agent in activeAgents" :key="agent.id">
                    <td><router-link :to="{name: 'agentMonitor', params: {jobId: agent.id}}">{{agent.name}}</router-link></td>
                    <td v-html="tagsMapToString(agent.tags, 2)"></td>
                    <td>{{agent.numActiveTasks}}</td>
                    <td>{{momentToStringV1(agent.lastHeartbeatTime)}}</td>
                  </tr>
                </tbody>
              </table>
            </template>
            <p v-else class="has-text-centered is-size-5 mt-3">
              <router-link :to="{name: 'downloadAgent'}">Download</router-link> your first agent.
            </p>

          </div>
        </div>
      </div>
    </div>


    <!--
    <div class="dashboard">

      <div class="dashboard-row">
        <div class="dashboard-item dashboard-item-small">
          <div class="dashboard-item-title">
            Agents
          </div>
          <div class="dashboard-item-text ">
            <router-link to="/agentMonitor">
              {{agents ? agents.length : 0}} Total
            </router-link>
          </div>
          <div class="dashboard-item-text dashboard-hightlight-item">
            {{activeAgents.length}} Active Agents
          </div>
        </div>

        <div class="dashboard-item dashboard-item-small">
          <div class="dashboard-item-title">
            Scripts
          </div>
          <div class="dashboard-item-text">
            <router-link to="/scripts">
              {{scripts ? scripts.length : 0}} Total
            </router-link>
          </div>
        </div>

        <div class="dashboard-item dashboard-item-small">
          <div class="dashboard-item-title">
            Jobs
          </div>
          <div class="dashboard-item-text">
            <router-link to="/jobList">
              {{jobDefs ? jobDefs.length : 0}} Total
            </router-link>
          </div>
        </div>
      </div>

      <div class="dashboard-row">
        <div class="dashboard-item dashboard-item-small">
          <div class="dashboard-item-title">
            Job Runs 
            <br><span class="smaller-text">({{getJobFetchTypeDescription(selectedJobFetchType)}})</span>
          </div>
          <div class="dashboard-item-text">
            <router-link to="/jobMonitor">
              {{filteredJobs.length}} Total
            </router-link>
          </div>
          <div class="dashboard-item-text dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.NOT_STARTED]}} Not Started
          </div>
          <div class="dashboard-item-text dashboard-hightlight-item dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.RUNNING]}} Running
          </div>
          <div class="dashboard-item-text dashboard-warning-item dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.INTERRUPTING]}} Interupting
          </div>
          <div class="dashboard-item-text dashboard-warning-item dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.INTERRUPTED]}} Interupted
          </div>
          <div class="dashboard-item-text dashboard-warning-item dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.CANCELING]}} Cancelling
          </div>
          <div class="dashboard-item-text dashboard-hightlight-item dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.COMPLETED]}} Completed
          </div>
          <div class="dashboard-item-text dashboard-error-item dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.FAILED]}} Failed
          </div>
          <div class="dashboard-item-text dashboard-item-text-indented">
            {{filteredJobsStatusCounts[JobStatus.SKIPPED]}} Skipped
          </div>
        </div>
        <div class="dashboard-item dashboard-item-medium">
          <div class="dashboard-item-title">
            Next Scheduled Jobs <span class="smaller-text">(Next 24 Hours)</span>
          </div>
          <div class="dashboard-item-text">
            <table class="table">
              <tr v-for="schedule in schedulesNext24Hours" :key="schedule.id">
                <td>
                  <a class="smallest-text" href="" @click.prevent="onClickedSchedule(schedule)">
                    {{momentToStringV1(schedule.nextScheduledRunDate)}}
                  </a>
                </td>
                <td>
                  <span class="smallest-text">
                    {{getJobName(schedule)}}
                  </span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
    -->
  
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel } from '../decorator';
import { isAgentActive } from '../store/agent/agentUtils';
import { Agent } from '../store/agent/types';
import { Script } from '../store/script/types';
import { JobDef, JobDefStatus } from '../store/jobDef/types';
import { Schedule } from '../store/schedule/types';
import { calcJobStatusColor } from '../store/job/types';
import { JobStatus, enumKeyToPretty } from '../utils/Enums'
import { StoreType } from '../store/types';
import { getMoment, momentToStringV1 } from '../utils/DateTime';
import moment from 'moment';
import { Job, JobFetchType, getJobFetchTypeDescription } from '../store/job/types';
import { tagsMapToString } from '../utils/Shared';

@Component({
  components: { }
})
export default class Dashboard extends Vue { 

  // expose to template
  private readonly JobStatus = JobStatus;
  private readonly momentToStringV1 = momentToStringV1;
  private readonly getJobFetchTypeDescription = getJobFetchTypeDescription;
  private readonly calcJobStatusColor = calcJobStatusColor;
  private readonly enumKeyToPretty = enumKeyToPretty;
  private readonly tagsMapToString = tagsMapToString;

  private async mounted(){
    // load all scripts,, maybe someday it will be problematic / too slow 
    this.$store.dispatch(`${StoreType.ScriptStore}/fetchModelsByFilter`);

    // Load schedules for the next 24 hours
    const now = moment();
    let scheduleFilter = `nextScheduledRunDate>${now.valueOf()}`;
    now.add(24, 'hours');
    scheduleFilter += `,nextScheduledRunDate<${now.valueOf()}`;
    this.$store.dispatch(`${StoreType.ScheduleStore}/fetchModelsByFilter`, {filter: scheduleFilter});

    this.$store.dispatch(`${StoreType.JobStore}/triggerFetchByType`);
    
    this.onFilteredJobsChanged();
  }

  private createTodayEmptyStatusCounts(){
    const todayStatusCount = {};
    for(let status in JobStatus){
      todayStatusCount[status] = 0;
    }
    return todayStatusCount;
  }

  @BindStoreModel({ storeType: StoreType.AgentStore, selectedModelName: 'models'})
  private agents!: Agent[]; 

  private get activeAgents(){
    if(this.agents){
      return this.agents.filter((agent: Agent) => {
        return isAgentActive(agent);
      });
    }
    else {
      return [];
    }
  }

  @BindStoreModel({storeType: StoreType.ScriptStore, selectedModelName: 'models'})
  private scripts!: Script[]; 

  @BindStoreModel({storeType: StoreType.JobDefStore, selectedModelName: 'models'})
  private jobDefs!: JobDef[]; 

  private get runningJobDefs(): JobDef[]{
    return this.jobDefs ? this.jobDefs.filter((jobDef: JobDef) => jobDef.status === JobDefStatus.RUNNING) : [];
  }

  private get pausedJobDefs(): JobDef[]{
    return this.jobDefs ? this.jobDefs.filter((jobDef: JobDef) => jobDef.status === JobDefStatus.PAUSED) : [];
  }

  @BindStoreModel({storeType: StoreType.JobStore, selectedModelName: 'selectedJobFetchType'})
  private selectedJobFetchType?: JobFetchType;

  @BindStoreModel({storeType: StoreType.JobStore, selectedModelName: 'models'})
  private jobs!: Job[];

  private get filteredJobs(): Job[]{
    return this.$store.getters[`${StoreType.JobStore}/getBySelectedJobFetchType`]();
  }

  private filteredJobsStatusCounts : {[key: number]: number} = {}; // JobStatus > count

  @Watch('filteredJobs')
  private onFilteredJobsChanged(){
    const todayStatusCount = this.createTodayEmptyStatusCounts();

    for(let job of this.filteredJobs){
      todayStatusCount[job.status]++;
    }

    Vue.set(this, 'filteredJobsStatusCounts', todayStatusCount);
  }

  @BindStoreModel({storeType: StoreType.ScheduleStore, selectedModelName: 'models'})
  private schedules!: Schedule[]; 

  private get schedulesNext24Hours(): Schedule[] {
    const now = moment();
    const nowPlus24Hours = moment(now);
    nowPlus24Hours.add(24, 'hours');

    if(this.schedules){
      return this.schedules.filter((schedule: Schedule) => {
        const nextScheduledRunDate = getMoment(schedule.nextScheduledRunDate);
        return nextScheduledRunDate.isBetween(now, nowPlus24Hours);
      });
    }
    else {
      return [];
    }
  }

  private getJobName(schedule: Schedule): string {
    const jobDef = this.$store.state[StoreType.JobDefStore].storeUtils.findById(schedule._jobDefId);

    if(jobDef){
      return jobDef.name;
    }
    else {
      return 'Job Not Loaded'; // this shouldn't happen coz all job defs are loaded at startup
    }
  }

  private onClickedSchedule(schedule: Schedule){
    this.$router.push(`/jobDesigner/${schedule._jobDefId}/schedule`);
  }

  private get recentJobs(): Job[] {
    return this.$store.getters[`${StoreType.JobStore}/getLatestJobs`]();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  .sg-container-p {
    background: var(--main-background-color);
  }

  .dashboard {
    margin-right: 20px;
    margin-top: 40px;

    .dashboard-row {

      display: flex;
      margin-top: 20px;

      .dashboard-item-small {
        width: 350px;
      }

      .dashboard-item-medium {
        width: 720px;
      }

      .dashboard-item {
        padding: 12px;
        margin-left: 20px;

        border-color: lightgray;
        border-width: 1px;
        border-style: solid;
        border-radius: 5px;

        .dashboard-item-title {
          font-weight: 700;
          font-size: 36px;

          .smaller-text {
            font-size: 18px;
          }
        }

        .smallest-text {
          font-size: 18px;
        }

        .dashboard-item-text {
          margin-left: 12px;
          font-weight: 700;
          font-size: 24px;
        }

        .dashboard-item-text-indented {
          margin-left: 24px;
        }

        .dashboard-hightlight-item {
          color: green;
        }

        .dashboard-warning-item {
          color: orange;
        }

        .dashboard-error-item {
          color: red;
        }
      }
    }
  }
</style>
