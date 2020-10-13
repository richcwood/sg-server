<template>
  <div class="home">
    <!-- Filter -->
    <table class="table" width="500px">
      <tbody class="tbody">
        <tr class="tr">
          <td class="td">
            <span style="position: relative;">
              <input class="input" style="padding-left: 30px;" type="text" v-model="filterString" placeholder="Filter by Job Name and Created By">
              <font-awesome-icon icon="search" style="position: absolute; left: 10px; top: 10px; color: #dbdbdb;" />
            </span>
          </td>
        </tr>
        <tr class="tr">
          <td class="td"><datepicker input-class="input" v-model="filterDate" name="filterDate" :highlighted="{dates:[todaysDate]}"></datepicker></td>
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
                Filter date: <span style="font-weight: 700;">{{momentToStringV3(filterDate)}}</span>
                (only jobs after this date will be shown here)
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
          <td class="td">{{enumKeyToPretty(JobStatus, job.status)}}</td>
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
import { StoreType } from '@/store/types';
import { Job } from '@/store/job/types';
import { BindStoreModel } from '@/decorator';
import { momentToStringV1, momentToStringV3 } from '@/utils/DateTime';
import moment from 'moment';
import axios from 'axios';
import { JobStatus, TaskStatus, enumKeyToPretty, enumKeys } from '@/utils/Enums';
import { User } from '@/store/user/types';

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

  private readonly todaysDate = new Date();

  // Filter inputs
  private filterDate = (moment().startOf('day').subtract('day', 3)).toString();
  private filterString = '';
  private filterStatus = enumKeys(JobStatus); // All status included by default

  private hideStatusPopup = true; // hidden by default

  private get defaultStoreType(){return StoreType.JobStore};

  @BindStoreModel({selectedModelName: 'models'})
  private jobs!: Job[];

  @BindStoreModel()
  selected!: Job;

  private get filteredJobs(): Job[] {
    const filterMoment = this.filterDate ? moment(this.filterDate) : null;

    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase.split(' ').map(item => item.trim()).filter(item => item);
    const filteredJobs: Job[] = this.jobs.filter((job: Job) => {
      if(filterMoment){
        const momentStarted = moment(job.dateStarted);

        if(momentStarted < filterMoment){
          return false;
        }
      }

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

    // sort by dateStarted
    filteredJobs.sort((jobA: Job, jobB: Job) => {
      if(jobA.dateStarted && jobB.dateStarted){
        return (new Date(jobB.dateStarted)).getTime() - (new Date(jobA.dateStarted)).getTime();
      }
      else {
        return 0;
      }
    });

    return filteredJobs;
  }

  private async mounted(){
    document.addEventListener('click', this.onGlobalClicked);
    document.addEventListener('touchstart', this.onGlobalClicked);

    // restore last filters if possible
    if(localStorage.getItem('jobMonitor_filterDate')){
      this.filterDate = localStorage.getItem('jobMonitor_filterDate');
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
    localStorage.setItem('jobMonitor_filterDate', this.filterDate);
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
        return {name: userId};
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
        email: 'Error'
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