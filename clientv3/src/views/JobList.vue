 <template>
  <div class="sg-container-p">

    <!-- Modals -->
    <modal name="create-jobdef-modal" :classes="'round-popup'" :width="400" :height="200">
      <validation-observer ref="newJobValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
            <tr>
              <td></td>
              <td>Create a new job</td>
            </tr>
            <tr>
              <td>Job Name</td>
              <td>
                <validation-provider name="Job Name" rules="required|object-name" v-slot="{ errors }">
                  <input class="input" id="create-jobdef-modal-autofocus" type="text" v-on:keyup.enter="saveNewJobDef" autofocus v-model="newJobName" placeholder="Enter the new job name">
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr>
              <td></td>
              <td>
                <div class="buttons">
                  <button class="button is-primary" @click="saveNewJobDef">Create new job</button> 
                  <button class="button" @click="cancelCreateNewJobDef">Cancel</button>
                </div>
              </td>
            </tr>
          </tbody> 
        </table>
      </validation-observer>
    </modal>

    <modal name="export-jobdefs-modal" :width="400" height="auto">
      <validation-observer tag="div" class="p-3" ref="exportJobDefsValidationObserver" v-slot="{ invalid }">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label text-nowrap">Export file name</label>
          </div>
          <div class="field-body">
            <validation-provider tag="div" class="field" name="Export File Name" rules="required" v-slot="{ errors }">
              <div class="control">
                <input class="input" id="export-jobdefs-modal-autofocus" type="text" v-model="exportJobDefsFileName" placeholder="Enter the export file name">
              </div>
              <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
            </validation-provider>
          </div>
        </div>
        <div class="table-wrapper mb-3">
          <table class="table is-fullwidth is-striped">
            <thead>
              <tr>
                <th>Job Name</th>
              </tr>
            </thead>
            <validation-provider name="job" tag="tbody" rules="required_checkbox" v-slot="{ errors }">
              <tr v-for="jobDef in filteredJobDefs" :key="jobDef.id">
                <td>
                  <input class="mr-3" type="checkbox" :value="jobDef.id" v-model="selectedJobDefIds" />
                  <span>{{ jobDef.name }}</span>
                </td>
              </tr>
              <tr class="white-gb" v-if="errors && errors.length > 0">
                <p class="help is-danger">{{ errors[0] }}</p>
              </tr>
            </validation-provider>
          </table>
        </div>
        <div class="buttons">
          <button class="button is-primary" @click="exportJobDefs" :disabled="invalid">Export jobs</button> 
          <button class="button" @click="cancelExportJobDefs">Cancel</button>
        </div>
      </validation-observer>
    </modal>

    <modal name="import-jobdefs-modal" :width="900" :height="450">
      <div class="round-popup" style="margin: 20px; width: 100%; height: 100%;">
        <div>
          Import jobs from a .sgj file that was generated via SaaSGlue.
        </div>
        <div>&nbsp;</div>
        <div>
          <input id="file_upload" class="input inputfile" style="width: 550px;" type="file" accept=".sgj" @change="onImportFilesChanged">
        </div>
        <div>&nbsp;</div>
        <div class="buttons">
          <button class="button is-primary" @click="onImportJobDefs" :disabled="importFiles.length === 0 || importingJobs">
            <template v-if="importingJobs">
              Importing Jobs ...
            </template>
            <template v-else>
              Import Jobs
            </template>
          </button>
          <button class="button" @click="onImportJobDefsClose">Close</button>
        </div>
        <div>&nbsp;</div>
        <div style="overflow: scroll; width: 800px; height: 250px;">
          <div v-for="row of importReport" :key="row">
            {{row}}
          </div>
        </div>
      </div>
    </modal>



    <div class="field">
      <div class="control has-icons-left">
        <input class="input" type="text" v-model="filterString" placeholder="Filter by Job Name and Created By">
        <span class="icon is-small is-left">
          <font-awesome-icon icon="search" />
        </span>
      </div>
    </div>
    <div class="buttons">
      <button class="button is-primary" @click="createNewJobDef">Create new job</button>
      <button class="button" :disabled="filteredJobDefs.length === 0" @click="onExportJobDefsClicked">Export Jobs</button>
      <button class="button" @click="onImportJobDefsClicked">Import Jobs</button>
    </div>

    <!-- Job Def selection -->
    <table class="table is-striped">
      <thead>
        <tr>
          <th>Job Definition Name</th>
          <th>Created By</th>
          <th>Date Created</th>
          <th>Schedule</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="jobDef in filteredJobDefs" :key="jobDef.id">
          <td>
            <router-link :to="{name: 'jobDesigner', params: {jobId: jobDef.id}}">{{jobDef.name}}</router-link>
          </td>
          <td>{{getUser(jobDef.createdBy).name}}</td>
          <td>{{momentToStringV1(jobDef.dateCreated)}}</td>
          <td>
            <a href="#" @click.prevent="onClickedScheduleLinkText(jobDef)">{{getScheduleLinkTextForJobDef(jobDef)}}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindStoreModel } from '../decorator';
import { StoreType } from '../store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '../store/alert/types';
import { showErrors } from '../utils/ErrorHandler';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { focusElement } from '../utils/Shared';
import { JobDef } from '../store/jobDef/types';
import { User } from '../store/user/types';
import { momentToStringV1 } from '../utils/DateTime';
import { Schedule } from '../store/schedule/types';
import axios from 'axios';

@Component({
  components: { ValidationProvider, ValidationObserver },
  props: { },
})
export default class JobList extends Vue { 
  
  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;

  private filterString = '';

  private mounted(){
    if(localStorage.getItem('jobList_filterString')){
      this.filterString = localStorage.getItem('jobList_filterString');
    }
  }

  private beforeDestroy(){
    localStorage.setItem('jobList_filterString', this.filterString);
  }

  @BindStoreModel({storeType: StoreType.JobDefStore, selectedModelName: 'models'})
  private jobDefs!: JobDef[];
  
  private get filteredJobDefs(): JobDef[]{
    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase.split(' ').map(item => item.trim()).filter(item => item);
    const filteredJobDefs = this.jobDefs.filter((jobDef: JobDef) => {
      if(filterUCaseItems.length === 0){
        return true;
      }
      else {
        return filterUCaseItems.some((filter: string) => {
          if(jobDef.name.toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          else if(this.getUser(jobDef.createdBy).name.toUpperCase().indexOf(filter) !== -1){
            return true;
          }
          else {
            return false;
          }
        });
      }
    });

    filteredJobDefs.sort((jobDefA: JobDef, jobDefB: JobDef) => {
      if(jobDefA.dateCreated && jobDefB.dateCreated){
        return (new Date(jobDefB.dateCreated)).getTime() - (new Date(jobDefA.dateCreated)).getTime();
      }
      else {
        return 0;
      }
    });

    return filteredJobDefs;
  }

  private async runTest(){
    const jobDef: JobDef = this.filteredJobDefs[1];
    console.log(jobDef);

    const jobRuns = await this.$store.dispatch(`${StoreType.JobStore}/fetchModelsByFilter`, {filter: `_jobDefId==${jobDef.id}`});

    console.log('jobRuns', jobRuns);

    // for(let jobDef of this.filteredJobDefs){
    //   console.log(jobDef);
    // }
  }

  private newJobName = '';

  private createNewJobDef(){
    this.newJobName = '';
    this.$modal.show('create-jobdef-modal');
    focusElement('create-jobdef-modal-autofocus');
  }

  private cancelCreateNewJobDef(){
    this.$modal.hide('create-jobdef-modal');
  }

  private async saveNewJobDef(){
    if( ! await (<any>this.$refs.newJobValidationObserver).validate()){
      return;
    }

    try {
      const userEmail = this.$store.state[StoreType.TeamStore].userEmail;

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Creating job - ${this.newJobName}`, AlertPlacement.FOOTER));
      const newJob: JobDef = {
        name: this.newJobName
      }

      const savedJob = await this.$store.dispatch(`${StoreType.JobDefStore}/save`, newJob);
      this.$router.push(`/jobDesigner/${savedJob.id}`);
    }
    catch(err){
      console.error(err);
      showErrors('Error creating job', err);
    }
    finally {
      this.$modal.hide('create-jobdef-modal');
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
        email: 'Error',
        teamIdsInvited: [],
        teamIds: [],
        companyName: ''
      }
    }
  }

  private getScheduleLinkTextForJobDef(jobDef: JobDef): string {
    const schedules = this.getSchedulesForJobDef(jobDef);

    if(schedules.length === 0){
      return 'none';
    }
    else if(schedules.length === 1){
      return `${schedules[0].TriggerType}, ${schedules[0].isActive ? 'active' : 'in-active'}`;
    }
    else {
      return `${schedules.length} schedules`;
    }
  }

  private onClickedScheduleLinkText(jobDef: JobDef){
    this.$router.push(`/jobDesigner/${jobDef.id}/schedule`);
  }

  private getSchedulesForJobDef(jobDef: JobDef): Schedule[] {
    this.$store.dispatch(`${StoreType.ScheduleStore}/fetchModelsByFilter`, {filter: `_jobDefId==${jobDef.id}`})

    // Trigger the filter and the getters will be reactive as the data loads
    return this.$store.getters[`${StoreType.ScheduleStore}/getByJobDefId`](jobDef.id);
  }

  private selectedJobDefIds = [];
  private exportJobDefsFileName = '';

  private onExportJobDefsClicked(){
    this.exportJobDefsFileName = '';
    this.$modal.show('export-jobdefs-modal');
    focusElement('export-jobdefs-modal-autofocus');
  }

  private cancelExportJobDefs(){
    this.$modal.hide('export-jobdefs-modal');
  }

  private async exportJobDefs(){
    try {
      if( ! await (<any>this.$refs.exportJobDefsValidationObserver).validate()){
        return;
      }

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Exporting selected jobs.  This can take a while...`, AlertPlacement.FOOTER));

      const {data} = await axios.get(`/api/v0/jobdef/export?filter=id->${JSON.stringify(this.selectedJobDefIds)}`);
      
      // https://medium.com/@drevets/you-cant-prompt-a-file-download-with-the-content-disposition-header-using-axios-xhr-sorry-56577aa706d6
      const url = window.URL.createObjectURL(new Blob([JSON.stringify(data)]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${this.exportJobDefsFileName}.sgj`);
      document.body.appendChild(link);
      link.click();
      this.$modal.hide('export-jobdefs-modal');

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Export / download complete`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors('Error exporting job', err);
    }
  }

  private onImportJobDefsClicked(){
    this.importFiles = [];
    this.$modal.show('import-jobdefs-modal');
  }

  private importFiles = [];

  private onImportFilesChanged($event: any){
    for(let file of $event.target.files){
      this.importFiles.push(file);
    }
  }

  private onImportJobDefsClose(){
    this.$modal.hide('import-jobdefs-modal');
  }

  private importingJobs = false;
  private importReport = [];

  private async onImportJobDefs(){
    try {
      this.importingJobs = true;
      this.importReport = [];
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Importing jobs.  This can take a while...`, AlertPlacement.FOOTER));

      const formData = new FormData();
      
      // const imagefile = document.querySelector('#file');
      // formData.append('image', imagefile.files[0]);
      formData.append('file', this.importFiles[0]);

      const {data: {data: importReport}} = await axios.post('/api/v0/jobdef/import', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
      });

      this.importReport = importReport;
      this.importReport.unshift('Results of the import');
      this.importReport.unshift('Successfully imported the jobs file to your team!');
      
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Import jobs completed.  They should appear quickly in the jobs list.`, AlertPlacement.FOOTER));
    }
    catch(err){
      console.error(err);
      showErrors('Error importing job', err);
    }
    finally {
      this.importingJobs = false;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  table {
    border-width: 0;
  }

  [data-modal="export-jobdefs-modal"] .v--modal-box {
    background: #fff;
  }

  .table-wrapper {
    max-height: 200px;
    overflow: auto;

    .white-gb {
      background-color: #fff !important;
    }
  }
</style>
