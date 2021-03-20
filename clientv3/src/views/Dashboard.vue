 <template>
  <div style="margin-left: 36px; margin-right: 12px;">
    <div class="dashboard">

      <div class="dashboard-row">
        <div class="dashboard-item">
          <div class="dashboard-item-title">
            Agents
          </div>
          <div class="dashboard-item-text dashboard-item-small">
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
        <div class="dashboard-item dashboard-item-full">
          <div class="dashboard-item-title">
            Job Runs
          </div>
          <div class="dashboard-item-text">
            <router-link to="/jobMonitor">
              {{jobs ? jobs.length : 0}} Total
            </router-link>
          </div>
          <div class="dashboard-item-text">
            &nbsp;
          </div>
          <div class="dashboard-item-text">
            {{jobsToday.length}} Runs Today
          </div>
          <div class="dashboard-item-text dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.NOT_STARTED]}} Not Started
          </div>
          <div class="dashboard-item-text dashboard-hightlight-item dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.RUNNING]}} Running
          </div>
          <div class="dashboard-item-text dashboard-warning-item dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.INTERRUPTING]}} Interupting
          </div>
          <div class="dashboard-item-text dashboard-warning-item dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.INTERRUPTED]}} Interupted
          </div>
          <div class="dashboard-item-text dashboard-warning-item dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.CANCELING]}} Cancelling
          </div>
          <div class="dashboard-item-text dashboard-hightlight-item dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.COMPLETED]}} Completed
          </div>
          <div class="dashboard-item-text dashboard-error-item dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.FAILED]}} Failed
          </div>
          <div class="dashboard-item-text dashboard-item-text-indented">
            {{jobsTodayStatusCounts[JobStatus.SKIPPED]}} Skipped
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
import { Job } from '../store/job/types';
import { JobStatus } from '../utils/Enums'
import { StoreType } from '../store/types';
import { isToday } from '../utils/DateTime';
import { AccessKey, AccessKeyType } from '../store/accessKey/types';
import { showErrors } from '../utils/ErrorHandler';
import axios from 'axios';

@Component({
  components: { }
})
export default class Dashboard extends Vue { 

  private readonly JobStatus = JobStatus;

  private async mounted(){
    // load all scripts,, maybe someday it will be problematic / too slow 
    this.$store.dispatch(`${StoreType.ScriptStore}/fetchModelsByFilter`);
    this.onJobsTodayChanged();
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

  private get jobsToday(){
    return this.jobs.filter((job: Job) => {
      return isToday(job.dateStarted);
    });
  }

  private jobsTodayStatusCounts : {[key: number]: number} = {}; // JobStatus > count

  @Watch('jobsToday')
  private onJobsTodayChanged(){
    const todayStatusCount = this.createTodayEmptyStatusCounts();

    for(let job of this.jobsToday){
      todayStatusCount[job.status]++;
    }

    console.log('now set to ', todayStatusCount);
    Vue.set(this, 'jobsTodayStatusCounts', todayStatusCount)
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

  .dashboard {

    margin-right: 20px;
    margin-top: 40px;

    .dashboard-row {

      display: flex;
      margin-top: 20px;

      .dashboard-item-small {
        width: 300px;
      }

      .dashboard-item-full {
        width: 980px;
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
