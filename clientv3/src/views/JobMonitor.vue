<template>
  <div class="home">
    <!-- Filter -->
    <table class="table" width="500px">
      <tbody class="tbody">
        <tr class="tr">
          <td class="td">
            <select class="input" style="margin-bottom: 12px;" v-model="selectedJobFetchType">
              <option v-for="jobFetchType in enumKeys(JobFetchType)" :key="jobFetchType" :value="jobFetchType">{{getJobFetchTypeDescription(jobFetchType)}}</option>
            </select>
            <span style="position: relative;">
              <input class="input" style="padding-left: 30px;" type="text" v-model="filterString" placeholder="Filter by Job Name and Created By">
              <font-awesome-icon icon="search" style="position: absolute; left: 10px; top: 10px; color: #dbdbdb;" />
            </span>
          </td>
        </tr>
        <tr class="tr">
          <td ref="statusPopupContainer" class="td" style="width:400px">
            <a href="" @click.prevent="hideStatusPopup = !hideStatusPopup">
              <span v-for="(statusTypeKey, index) in filterStatus" v-bind:key="statusTypeKey"> {{enumKeyToPretty(JobStatus, statusTypeKey)}}<span v-if="index !== Object.keys(filterStatus).length-1">,</span> </span>
            </a>
            <div style="position:relative;" :hidden="hideStatusPopup">
              <div class="status-popup" style="position:absolute;">
                <div>
                  <a @click.prevent="onSelectAllFilterStatusClicked()">select all</a>
                </div>
                <div>
                  <a @click.prevent="onSelectNoneFilterStatusClicked()">select none</a>
                </div>
                <div v-for="statusTypeKey in enumKeys(JobStatus)" v-bind:key="statusTypeKey">
                  <label class="checkbox">
                    <input type="checkbox" :value="statusTypeKey" v-model="filterStatus">
                    {{enumKeyToPretty(JobStatus, statusTypeKey)}}
                  </label>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- List of jobs -->
    <table class="table is-striped">
      <thead class="thead">
        <td class="td">Run Number</td>
        <td class="td">Job Name</td>
        <td class="td">Created By</td>
        <td class="td">Status</td>
        <td class="td">Started</td>
        <td class="td">Completed</td>
      </thead>

      <tbody class="tbody">
        <tr class="tr" v-if="filteredJobs.length === 0">
          <td class="td" colspan="6">
            <div style="margin-left: 10px;">
              <p>
                No results
              </p>
              <p style="margin-left: 10px;">
                Filter date: <span style="font-weight: 700;">{{getJobFetchTypeDescription(jobFetchType)}}</span>
                (only jobs in the date range will be shown)
                <br><br>
                <span v-if="filterString">
                  Filter job name and created by: <span style="font-weight: 700;">{{filterString}}</span>
                </span>
              </p>
            </div>
          </td>
        </tr>

        <tr class="tr" v-for="job in filteredJobs" v-bind:key="job.id">
          <td class="td"><router-link :to="{name: 'jobDetailsMonitor', params: {jobId: job.id}}">Monitor {{job.runId}}</router-link></td>
          <td class="td">
            <template v-if="job._jobDefId">
              <router-link :to="{name: 'jobDesigner', params: {jobId: job._jobDefId}}">{{job.name}}</router-link>
            </template>
            <template v-else>
              {{job.name}}
            </template>
          </td>
          <td class="td">{{getUser(job.createdBy, job.name).name}}</td>
          <td class="td" :style="{color: calcJobStatusColor(job.status)}" >{{enumKeyToPretty(JobStatus, job.status)}}</td>
          <td class="td">{{momentToStringV1(job.dateStarted)}}</td>
          <td class="td">{{momentToStringV1(job.dateCompleted)}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Datepicker from 'vuejs-datepicker';
import { StoreType } from '../store/types';
import { Job, JobFetchType, getJobFetchTypeDescription } from '../store/job/types';
import { BindStoreModel } from '../decorator';
import { momentToStringV1, momentToStringV3, getMoment } from '../utils/DateTime';
import moment from 'moment';
import _ from 'lodash';
import { JobStatus, enumKeyToPretty, enumKeys } from '../utils/Enums';
import { User } from '../store/user/types';

@Component({
  components: {
    Datepicker
  },
})
export default class JobMonitor extends Vue {

  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly momentToStringV3 = momentToStringV3;
  private readonly JobStatus = JobStatus;
  private readonly enumKeyToPretty = enumKeyToPretty;
  private readonly enumKeys = enumKeys;
  private readonly JobFetchType = JobFetchType;
  private readonly getJobFetchTypeDescription = getJobFetchTypeDescription;

  private readonly todaysDate = new Date();

  // Filter inputs
  private filterString = '';
  private filterStatus = enumKeys(JobStatus); // All status included by default

  private hideStatusPopup = true; // hidden by default

  private get defaultStoreType(){return StoreType.JobStore};

  @BindStoreModel({selectedModelName: 'models'})
  private jobs!: Job[];

  @BindStoreModel()
  selected!: Job;

  private selectedJobFetchType = JobFetchType.LAST_SEVEN_DAYS;

  private get filteredJobsByFetchType(): Job[] {
    const today = moment();
    today.startOf('day');

    let daysDiff;

    if(this.selectedJobFetchType == JobFetchType.TODAY){
      daysDiff = 1;
    }
    else if(this.selectedJobFetchType == JobFetchType.LAST_SEVEN_DAYS){
      daysDiff = 7;
    }
    else if(this.selectedJobFetchType == JobFetchType.LAST_MONTH){
      const monthAgo = moment(today);
      monthAgo.add(-1, 'month');
      daysDiff = today.diff(monthAgo, 'day');
    }
    else if(this.selectedJobFetchType == JobFetchType.LAST_TWO_MONTHS){
      const twoMonthsAgo = moment(today);
      twoMonthsAgo.add(-2, 'month');
      daysDiff = today.diff(twoMonthsAgo, 'day');
    }
    else {
      throw 'Unknown JobFetchType in JobMonitor' + this.selectedJobFetchType;
    }
    
    console.log('yo, date diff is ', daysDiff);

    return this.jobs.filter((job: Job) => {
      const jobDate = getMoment(job.dateStarted);
      jobDate.startOf('day');
      console.log('date diff is', jobDate.diff(today, 'day'));
      return today.diff(jobDate, 'day') <= daysDiff;
    });
  }

  private get filteredJobs(): Job[] {
    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase.split(' ').map(item => item.trim()).filter(item => item);
    const filteredJobs: Job[] = this.filteredJobsByFetchType.filter((job: Job) => {
      if(this.filterStatus.indexOf(''+job.status) === -1){
        return false;
      }
      
      if(filterUCaseItems.length === 0){
        return true;
      }
      else {
        return filterUCaseItems.some((filter: string) => {
          if(job.name.toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          else if(this.getUser(job.createdBy, job.name).name.toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          else {
            return false;
          }
        });
      }
    });

    const statusToSortValue = (status: JobStatus) => {
      if(status === JobStatus.COMPLETED || status === JobStatus.SKIPPED){
        return JobStatus.COMPLETED + 100;
      }
      else {
        return status;
      }
    }

    // sort by status, dateStarted
    filteredJobs.sort((jobA: Job, jobB: Job) => {
      if(jobA.status != jobB.status){
        return statusToSortValue(jobA.status) - statusToSortValue(jobB.status);
      }
      else if(jobA.dateStarted && jobB.dateStarted){
        return (new Date(jobB.dateStarted)).getTime() - (new Date(jobA.dateStarted)).getTime();
      }
      else if(jobA.dateCompleted && jobB.dateCompleted){
        return (new Date(jobB.dateCompleted)).getTime() - (new Date(jobA.dateCompleted)).getTime();
      }
      else {
        return 0;
      }
    });

    return filteredJobs;
  }

  private calcJobStatusColor(status: JobStatus){
    switch(status){
      case JobStatus.NOT_STARTED:
      case JobStatus.COMPLETED:
        return 'black';
      case JobStatus.RUNNING:
        return 'green';
      case JobStatus.FAILED:
        return 'red';
      default:
        return 'orange';
    }
  }

  private async mounted(){
    document.addEventListener('click', this.onGlobalClicked);
    document.addEventListener('touchstart', this.onGlobalClicked);

    // restore last filters if possible
    if(localStorage.getItem('jobMonitor_jobFetchType')){
      this.selectedJobFetchType = Number.parseInt(localStorage.getItem('jobMonitor_jobFetchType'));
    }

    if(localStorage.getItem('jobMonitor_filterString')){
      this.filterString = localStorage.getItem('jobMonitor_filterString');
    }

    if(localStorage.getItem('jobMonitor_filterStatus')){
      this.filterStatus = JSON.parse(localStorage.getItem('jobMonitor_filterStatus'));
    }
  }

  private beforeDestroy(){
    document.removeEventListener('click', this.onGlobalClicked);
    document.removeEventListener('touchstart', this.onGlobalClicked);

    // save current filters
    localStorage.setItem('jobMonitor_jobFetchType', ''+this.selectedJobFetchType);
    localStorage.setItem('jobMonitor_filterString', this.filterString);
    localStorage.setItem('jobMonitor_filterStatus', JSON.stringify(this.filterStatus));
  }

  // Possibly put this in a reusable directive if this situation happens more often
  private onGlobalClicked(e: any){
    if(!(<any>this.$refs.statusPopupContainer).contains(e.target)){
      this.hideStatusPopup = true;
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
          Vue.set(this.loadedUsers, userId, {name: userId});

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

  private onSelectAllFilterStatusClicked(){
    this.filterStatus = enumKeys(JobStatus);
  }

  private onSelectNoneFilterStatusClicked(){
    this.filterStatus = [];
  }
}
</script>

<style scoped lang="scss">
  table {
    border-width: 0;
  }

  td {
    border-width: 0 !important;
  }

  .status-popup {
    background-color: white; 
    border-radius: 5px; 
    border-style: solid;
    border-color: lightgray;
    border-width: 1px;
    padding: 10px;
  }
</style>