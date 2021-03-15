 <template>
  <div class="main" style="margin-left: 36px; margin-right: 12px;">

    <!-- Modals -->
    <modal name="create-jobdef-modal" :classes="'round-popup'" :width="400" :height="200">
      <validation-observer ref="newJobValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
            <tr class="tr">
              <td class="td"></td>
              <td class="td">Create a new job</td>
            </tr>
            <tr class="tr">
              <td class="td">Job Name</td>
              <td class="td">
                <validation-provider name="Job Name" rules="required|object-name" v-slot="{ errors }">
                  <input class="input" id="create-jobdef-modal-autofocus" type="text" v-on:keyup.enter="saveNewJobDef" autofocus v-model="newJobName" placeholder="Enter the new job name">
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">{{ errors[0] }}</div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="saveNewJobDef">Create new job</button> 
                <button class="button button-spaced" @click="cancelCreateNewJobDef">Cancel</button>
              </td>
            </tr>
          </tbody> 
        </table>
      </validation-observer>
    </modal>




    <!-- Job Def selection -->
    <div>
      <table class="table" width="100%">
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
            <td class="td"><button class="button is-primary" @click="createNewJobDef">Create new job</button></td>
          </tr>

          <tr class="tr">
            <td class="td">
              <table class="table">
                <thead class="thead">
                  <tr class="tr">
                    <td class="td">Job Definition Name</td>
                    <td class="td">Created By</td>
                    <td class="td">Date Created</td>
                    <td class="td">Schedule</td>
                  </tr>
                </thead>
                <tbody>
                  <tr class="tr" v-for="jobDef in filteredJobDefs" v-bind:key="jobDef.id">
                    <td class="td"><router-link :to="{name: 'jobDesigner', params: {jobId: jobDef.id}}">{{jobDef.name}}</router-link></td>
                    <td class="td">{{getUser(jobDef.createdBy).name}}</td>
                    <td class="td">{{momentToStringV1(jobDef.dateCreated)}}</td>
                    <td class="td">
                      <a @click="onClickedScheduleLinkText(jobDef)">{{getScheduleLinkTextForJobDef(jobDef)}}</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { BindStoreModel, BindSelected, BindSelectedCopy } from '@/decorator';
import { StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { showErrors } from '@/utils/ErrorHandler';
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { focusElement } from '@/utils/Shared';
import { JobDef } from '@/store/jobDef/types';
import { User } from '@/store/user/types';
import axios from 'axios';
import { momentToStringV1 } from '@/utils/DateTime';
import { Schedule } from "@/store/schedule/types";

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
  
  private get filteredJobDefs(): object[]{
    const filterUCase = this.filterString.toUpperCase();
    // split by whitespace and remove empty entries
    const filterUCaseItems = filterUCase.split(' ').map(item => item.trim()).filter(item => item);
    return this.jobDefs.filter((jobDef: JobDef) => {
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

  .button-spaced {
    margin-left: 12px;
  }

</style>
