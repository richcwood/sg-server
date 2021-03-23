 <template>
  <div style="margin-left: 36px; margin-right: 12px;">
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
            Job Runs <span class="smaller-text">(Last 7 Days)</span>
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
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { BindStoreModel } from '../decorator';
import { isAgentActive } from '../store/agent/agentUtils';
import { Agent } from '../store/agent/types';
import { Script } from '../store/script/types';
import { JobDef } from '../store/jobDef/types';
import { Schedule } from '../store/schedule/types';
import { JobStatus } from '../utils/Enums'
import { StoreType } from '../store/types';
import { getMoment, momentToStringV1 } from '../utils/DateTime';
import moment from 'moment';
import { Job, JobFetchType } from '../store/job/types';

@Component({
  components: { }
})
export default class Dashboard extends Vue { 

  // expose to template
  private readonly JobStatus = JobStatus;
  private readonly momentToStringV1 = momentToStringV1;

  private async mounted(){
    // load all scripts,, maybe someday it will be problematic / too slow 
    this.$store.dispatch(`${StoreType.ScriptStore}/fetchModelsByFilter`);

    // Load the job runs for the dashboard
    this.$store.dispatch(`${StoreType.JobStore}/fetchModelByType`, {jobFetchType: JobFetchType.LAST_SEVEN_DAYS});

    // Load schedules for the next 24 hours
    const now = moment();
    let scheduleFilter = `nextScheduledRunDate>${now.valueOf()}`;
    now.add(24, 'hours');
    scheduleFilter += `,nextScheduledRunDate<${now.valueOf()}`;
    this.$store.dispatch(`${StoreType.ScheduleStore}/fetchModelsByFilter`, {filter: scheduleFilter});

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

  @BindStoreModel({storeType: StoreType.JobStore, selectedModelName: 'models'})
  private jobs!: Job[];

  private get filteredJobs(){
    if(!this.jobs){
      return [];
    }

    const today = moment();
    today.startOf('day');

    return this.jobs.filter((job: Job) => {
      const jobDate = getMoment(job.dateStarted);
      jobDate.startOf('day');
      return jobDate.diff(today, 'day') <= 7;
    });
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
      return 'Job Not Loaded';
    }
  }

  private onClickedSchedule(schedule: Schedule){
    this.$router.push(`/jobDesigner/${schedule._jobDefId}/schedule`);
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
