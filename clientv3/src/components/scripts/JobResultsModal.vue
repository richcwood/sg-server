<template>
  <ModalCard>
    <template #title>{{ selectedJob ? selectedJob.name : '' }} Execution Logs</template>

    <template #body>
      <div class="is-flex is-align-items-center">
        <span class="mr-3">{{ selectedJob.name }}</span>
        <span class="mr-3">{{ enumKeyToPretty(JobStatus, selectedJob.status) }}</span>

      </div>
      <task-monitor-details :selectedJobId="selectedJob.id" />
    </template>

    <template #footer>
      <button class="button is-ghost"
        :disabled="selectedJob.status !== JobStatus.RUNNING && selectedJob.status !== JobStatus.INTERRUPTED"
        @click="onCancelJobClicked">
        Cancel
      </button>
    </template>
  </ModalCard>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import axios from 'axios';

import { AlertPlacement, SgAlert } from '@/store/alert/types';
import { JobStatus, enumKeyToPretty } from '@/utils/Enums';
import ModalCard from "@/components/core/ModalCard.vue";
import { momentToStringV1 } from '@/utils/DateTime';
import { showErrors } from '@/utils/ErrorHandler';
import { BindSelected } from '@/decorator';
import { StoreType } from '@/store/types';
import { Job } from '@/store/job/types';

@Component({
  name: "JobResultsModal",
  components: { ModalCard },
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
}
</script>

<style lang="scss" scoped></style>
