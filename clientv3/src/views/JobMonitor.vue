<template>
  <div class="sg-container-p">
    <!-- Filter -->

    <div class="columns mb-0">
      <div class="column is-half">

        <div class="field">
          <div class="control">
            <div class="select is-fullwidth">
              <select v-model="selectedJobFetchType">
                <option v-for="jobFetchType in enumKeys(JobFetchType)" :key="jobFetchType" :value="jobFetchType">{{getJobFetchTypeDescription(jobFetchType)}}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="field">
          <div class="control has-icons-left">
            <input class="input" type="text" v-model="filterString" placeholder="Filter by Job Name and Created By">
            <span class="icon is-small is-left">
              <font-awesome-icon icon="search" />
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="is-relative mb-3" ref="statusPopupContainer">
      <a href="#" @click.prevent="hideStatusPopup = !hideStatusPopup">
        <span v-for="(statusTypeKey, index) in filterStatus" v-bind:key="statusTypeKey"> {{enumKeyToPretty(JobStatus, statusTypeKey)}}<span v-if="index !== Object.keys(filterStatus).length-1">,</span> </span>
      </a>
      <div class="is-relative" v-show="!hideStatusPopup">
        <div class="status-popup" style="position:absolute;">
          <div>
            <a @click.prevent="onSelectAllFilterStatusClicked()">select all</a>
          </div>
          <div>
            <a @click.prevent="onSelectNoneFilterStatusClicked()">select none</a>
          </div>
          <div v-for="statusTypeKey in enumKeys(JobStatus)" :key="statusTypeKey">
            <label class="checkbox">
              <input type="checkbox" :value="statusTypeKey" v-model="filterStatus">
              {{enumKeyToPretty(JobStatus, statusTypeKey)}}
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- List of jobs -->
    <table class="table is-striped is-hoverable">
      <thead>
        <tr>
          <th>Run Number</th>
          <th>Job Name</th>
          <th>Created By</th>
          <th>Status</th>
          <th>Started</th>
          <th>Completed</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="filteredJobs.length === 0">
          <td colspan="6" class="pl-5">
            <p>No results</p>
            <p class="pl-3">
              Filter date: <span class="has-text-weight-bold">{{getJobFetchTypeDescription(selectedJobFetchType)}}</span>
              (only jobs in the date range will be shown)
              <br />
              <span v-if="filterString">
                Filter job name and created by: <span class="has-text-weight-bold">{{filterString}}</span>
              </span>
            </p>
          </td>
        </tr>

        <tr v-for="job in filteredJobs" :key="job.id">
          <td><router-link :to="{name: 'jobDetailsMonitor', params: {jobId: job.id}}">Monitor {{job.runId}}</router-link></td>
          <td>
            <template v-if="job._jobDefId">
              <router-link :to="{name: 'jobDesigner', params: {jobId: job._jobDefId}}">{{job.name}}</router-link>
            </template>
            <template v-else>
              {{job.name}}
            </template>
          </td>
          <td>{{getUser(job.createdBy, job.name).name}}</td>
          <td :style="{color: calcJobStatusColor(job.status)}" >{{enumKeyToPretty(JobStatus, job.status)}}</td>
          <td>{{momentToStringV1(job.dateStarted)}}</td>
          <td>{{momentToStringV1(job.dateCompleted)}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Datepicker from 'vuejs-datepicker';
import { StoreType } from '../store/types';
import { Job, JobFetchType, getJobFetchTypeDescription, calcJobStatusColor } from '../store/job/types';
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
  private readonly calcJobStatusColor = calcJobStatusColor;

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

  @BindStoreModel({storeType: StoreType.JobStore, selectedModelName: 'selectedJobFetchType', updateActionName: 'updateJobFetchType'})
  private selectedJobFetchType?: JobFetchType;

  private get filteredJobsByFetchType(): Job[] {
    return this.$store.getters[`${StoreType.JobStore}/getBySelectedJobFetchType`]();
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

  private mounted(){
    document.addEventListener('click', this.onGlobalClicked);
    document.addEventListener('touchstart', this.onGlobalClicked);

    if(localStorage.getItem('jobMonitor_filterString')){
      this.filterString = localStorage.getItem('jobMonitor_filterString');
    }

    if(localStorage.getItem('jobMonitor_filterStatus')){
      this.filterStatus = JSON.parse(localStorage.getItem('jobMonitor_filterStatus'));
    }

    this.$store.dispatch(`${StoreType.JobStore}/triggerFetchByType`);
  }

  private beforeDestroy(){
    document.removeEventListener('click', this.onGlobalClicked);
    document.removeEventListener('touchstart', this.onGlobalClicked);

    // save current filters
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
  .status-popup {
    background-color: white; 
    border-radius: 5px; 
    border-style: solid;
    border-color: lightgray;
    border-width: 1px;
    padding: 10px;
  }
</style>