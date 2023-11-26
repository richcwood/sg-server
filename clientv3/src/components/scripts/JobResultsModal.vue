<template>
  <div class="is-flex is-flex-direction-column" style="height:100%; background: white;">
    <template v-if="selectedJob">
      <header class="p-3 is-flex is-align-items-center is-justify-content-space-between">
        <p>{{ selectedJob.name }}</p>

        <div class="buttons">
          <button class="button" type="button"
            :disabled="selectedJob.status !== JobStatus.RUNNING && selectedJob.status !== JobStatus.INTERRUPTED"
            @click="onCancelJobClicked">
            Cancel Job
          </button>
          <button type="button" class="button" @click="onClose" @keypress.esc="onClose">Close (Esc)</button>
        </div>
      </header>

      <hr class="mb-3 mt-0" />
      <TaskMonitorDetails :selectedJobId="selectedJob.id" />
    </template>
    <div v-else>
      <header class="p-3 is-flex is-justify-content-end">
        <button type="button" class="button" @click="onClose" @keypress.esc="onClose">Close (Esc)</button>
      </header>
      <div class="is-flex is-justify-content-center">
        <p class="is-size-4"><span class="spinner"></span> Job is loading</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import axios from 'axios';

import TaskMonitorDetails from "@/components/TaskMonitorDetails.vue";
import { AlertPlacement, SgAlert } from '@/store/alert/types';
import { JobStatus, enumKeyToPretty } from '@/utils/Enums';
import { momentToStringV1 } from '@/utils/DateTime';
import { showErrors } from '@/utils/ErrorHandler';
import { BindSelected } from '@/decorator';
import { StoreType } from '@/store/types';
import { Job } from '@/store/job/types';

@Component({
  name: "JobResultsModal",
  components: { TaskMonitorDetails },
})
export default class JobResultsModal extends Vue {
  @Prop({ required: true }) public readonly jobId: string;

  @BindSelected({ storeType: StoreType.JobStore })
  public selectedJob: Job;

  public momentToStringV1 = momentToStringV1;
  public enumKeyToPretty = enumKeyToPretty;
  public JobStatus = JobStatus;
  public isFetchingJob = true;

  public created() {
    this.fetchJob(this.jobId);
  }

  private async fetchJob(id: string): Promise<void> {
    this.isFetchingJob = true;

    try {
      const job = await this.$store.dispatch(`${StoreType.JobStore}/fetchModel`, id);

      this.$store.dispatch(`${StoreType.JobStore}/select`, job);
    } catch (err) {
      console.error(err);
      showErrors('Error showing the "Script Results" tab', err);
    } finally {
      this.isFetchingJob = false;
    }
  }

  public async onCancelJobClicked() {
    try {
      await axios.post(`api/v0/jobaction/cancel/${this.selectedJob.id}`);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Job cancelled`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors("Error cancelling job", err);
    } finally {
      this.$emit('close');
    }
  }

  public onClose() {
    this.$emit('close');
  }
}
</script>

<style lang="scss" scoped>
.spinner {
  @include loader;

  display: inline-block;
}
</style>
