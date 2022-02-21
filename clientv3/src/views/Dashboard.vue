 <template>
  <div style="margin-left: 36px; margin-right: 12px;">

    <br><br>

    <div style="display: flex">
      <div class="dash-section" style="height: 800px; width: 800px;">
        <div class="dash-title-row">
          <img src="@/assets/images/job-run-icon.svg" style="width:40px;"/>
          <div class="dash-title">
            Job Runs
          </div>
          <div class="dash-title dash-title-add">
            <router-link :to="{name: 'jobList', params: {action: 'create'}}">
              +
            </router-link>
          </div>
        </div>
        <div>
          <span class="smaller-text">{{getJobFetchTypeDescription(selectedJobFetchType)}}
          </span>
        </div>
        <div style="margin-top: 12px;">
          <router-link to="/jobMonitor">
            Total {{filteredJobs.length}}
          </router-link>
          <router-link to="/jobMonitor" style="margin-left: 10px;">
            Not Started {{filteredJobsStatusCounts[JobStatus.NOT_STARTED]}}
          </router-link>
          <router-link to="/jobMonitor" style="margin-left: 10px;">
            Running {{filteredJobsStatusCounts[JobStatus.RUNNING]}}
          </router-link>
          <router-link to="/jobMonitor" style="margin-left: 10px;">
            Interupting {{filteredJobsStatusCounts[JobStatus.INTERRUPTING]}}
          </router-link>
          <router-link to="/jobMonitor" style="margin-left: 10px;">
            Interupted {{filteredJobsStatusCounts[JobStatus.INTERRUPTED]}}
          </router-link>
          <router-link to="/jobMonitor" style="margin-left: 10px;">
            Cancelling {{filteredJobsStatusCounts[JobStatus.CANCELING]}}
          </router-link>
          <router-link to="/jobMonitor" style="margin-left: 10px;">
            Completed {{filteredJobsStatusCounts[JobStatus.COMPLETED]}}
          </router-link>
        </div>
        <div>
          <hr>
        </div>
        <div class="dash-title">
          Recent Job Runs (up to 5 shown)
        </div>
        <div>
          <table class="table">
            <tr class="tr">
              <th class="th">Run Number</th>
              <th class="th">Name</th>
              <th class="th">Status</th>
              <th class="th">Started</th>
              <th class="th">Completed</th>
            </tr>
            <tr class="tr" v-for="job in recentJobs" v-bind:key="job.id">
              <td class="td"><router-link :to="{name: 'jobDetailsMonitor', params: {jobId: job.id}}">Monitor {{job.runId}}</router-link></td>
              <td class="td">
                <template v-if="job._jobDefId">
                  <router-link :to="{name: 'jobDesigner', params: {jobId: job._jobDefId}}">{{job.name}}</router-link>
                </template>
                <template v-else>
                  {{job.name}}
                </template>
              </td>
              <td class="td" :style="{color: calcJobStatusColor(job.status)}" >{{enumKeyToPretty(JobStatus, job.status)}}</td>
              <td class="td">{{momentToStringV1(job.dateStarted)}}</td>
              <td class="td">{{momentToStringV1(job.dateCompleted)}}</td>
            </tr>
          </table>
        </div>
        <div>
          <hr>
        </div>
        <div class="dash-title">
          Scheduled Job Runs (Next 24 Hours)
        </div>
        <div class="dash-title">
          <table class="table">
              <tr class="tr" v-for="schedule in schedulesNext24Hours" :key="schedule.id">
                <td class="td thin-td">
                  {{momentToStringV1(schedule.nextScheduledRunDate)}}
                </td>
                <td class="td thin-td">
                  <span class="smallest-text">
                    <a class="smallest-text" href="" @click.prevent="onClickedSchedule(schedule)">
                      {{getJobName(schedule)}}
                    </a>
                  </span>
                </td>
              </tr>
            </table>
        </div>
      </div>
      <div style="display: flex; flex-direction: column;">
        <div style="display: flex">
          <div class="dash-section" style="width: 500px;">
            <div class="dash-title-row">
              <img src="@/assets/images/job-icon.svg" style="width:40px;"/>
              <div class="dash-title" style="padding-right: 100px;">
                Jobs
              </div>
              <div class="dash-title dash-title-add">
                <router-link :to="{name: 'jobList', params: {action: 'create'}}">
                  +
                </router-link>
              </div>
            </div>
            <div style="margin-left: 12px;">
              <div>
                <router-link to="/jobList">
                  {{jobDefs ? jobDefs.length : 0}} Total
                </router-link>
              </div>
              <div>
                <router-link to="/jobList">
                  {{runningJobDefs ? runningJobDefs.length : 0}} Active
                </router-link>
              </div>
              <div>
                <router-link to="/jobList">
                  {{pausedJobDefs ? pausedJobDefs.length : 0}} Paused
                </router-link>
              </div>
            </div>
          </div>
          <div class="dash-section">
            <div class="dash-title-row">
              <img src="@/assets/images/step-icon.svg" style="width:40px;"/>
              <div class="dash-title" style="padding-right: 100px;">
                Scripts
              </div>
              <div class="dash-title dash-title-add">
                <router-link :to="{name: 'scripts', params: {action: 'create'}}">
                  +
                </router-link>
              </div>
            </div>
            <div style="margin-left: 12px;">
              <div>
                <router-link to="/scripts">
                  {{scripts ? scripts.length : 0}} Total
                </router-link>
              </div>
            </div>
          </div>
        </div>
        <div class="dash-section" style="height: 600px;">
          <div class="dash-title-row">
              <img src="@/assets/images/agent.svg" style="width:40px;"/>
              <div class="dash-title">
                Agents
              </div>
              <div class="dash-title dash-title-add">
                <router-link to="/downloadAgent">
                  +
                </router-link>
              </div>
            </div>
            <div style="margin-left: 12px;">
              <table class="table">
                <tr class="tr">
                  <td class="td">
                    <router-link to="/agentMonitor">
                      {{agents ? agents.length : 0}} Total
                    </router-link>
                  </td>
                  <td class="td">
                    <router-link to="/agentMonitor">
                      {{activeAgents ? activeAgents.length : 0}} Active
                    </router-link>
                  </td>
                </tr>
              </table>
              <div>
                <hr>
              </div>
              <div class="dash-title">
                Active Agents (up to 5 shown)
              </div>
              <table class="table">
                <tr class="tr">
                  <th class="th">Name</th>
                  <th class="th">Tags</th>
                  <th class="th">Num Running Tasks</th>
                  <th class="th">Last Heartbeat</th>
                </tr>
                <tr class="tr" v-for="agent in activeAgents" v-bind:key="agent.id">
                  <td class="td"><router-link :to="{name: 'agentMonitor', params: {jobId: agent.id}}">{{agent.name}}</router-link></td>
                  <td class="td">
                    <div v-html="tagsMapToString(agent.tags, 2)"></div>
                  </td>
                  <td class="td">{{agent.numActiveTasks}}</td>
                  <td class="td">{{momentToStringV1(agent.lastHeartbeatTime)}}</td>
                </tr>
              </table>
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
              <tr class="tr" v-for="schedule in schedulesNext24Hours" :key="schedule.id">
                <td class="td thin-td">
                  <a class="smallest-text" href="" @click.prevent="onClickedSchedule(schedule)">
                    {{momentToStringV1(schedule.nextScheduledRunDate)}}
                  </a>
                </td>
                <td class="td thin-td">
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

  table {
    border-width: 0;
  }

  td {
    border-width: 0 !important;
  }

  .thin-td {
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }


  .dash-section {
      padding: 16px;
      margin: 16px;
      padding-left: 24px;
      padding-right: 24px;

      border-color: lightgray;
      border-width: 1px;
      border-style: solid;
      border-radius: 5px;

      box-shadow: 4px 3px 6px 0px #ccc;;

      .dash-title-row {
        display: flex;
        margin-bottom: 8px;

        .dash-title {
          margin-left: 10px;
          margin-right: auto;
          font-weight: 700;
          font-size: 36px; 
        }

        .dash-title-add {
          margin-right: 0px;
        }
      }
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
