<template>
  <modal-card>
    <template #title>Script {{ script.name }} Jobs Usage</template>
    <template #body>
      <div style="width: 100%; height: 100%; background: white;">
        <table class="table">
          <tr class="tr">
            <td class="td">
              Script {{ script.name }} is used in the following jobs<br>
            </td>
          </tr>

          <tr class="tr" v-if="isLoading">
            <td class="td">
              <span class="spinner"></span>
            </td>
          </tr>
          <template v-else>
            <tr class="tr" v-if="scriptJobUsage.length === 0">
              <td class="td">
                This script is not used in any jobs
              </td>
            </tr>

            <tr class="tr" v-for="jobDef in scriptJobUsage" :key="jobDef.id">
              <td class="td">
                <router-link :to="{ name: 'jobDesigner', params: { jobId: jobDef.id } }">{{ jobDef.name }}</router-link>
              </td>
            </tr>
          </template>
        </table>
      </div>
    </template>
    <template #footer>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { uniq } from 'lodash';
import axios from "axios";

import ModalCard from "@/components/core/ModalCard.vue";
import { Script } from '@/store/script/types';

@Component({
  name: "JobStepDetailsModal",
  components: { ModalCard },
})
export default class JobStepDetailsModal extends Vue {
  @Prop({ required: true }) public readonly script: Script;

  public isLoading: boolean = true;
  public scriptJobUsage = [];

  public created() {
    this.fetchDetails();
  }

  private async fetchDetails() {
    try {
      const stepDefsResponse = await axios.get(`/api/v0/stepDef?filter=_scriptId==${this.script.id}`);
      const taskDefIds = uniq(stepDefsResponse.data.data.map(stepDef => stepDef._taskDefId));

      const taskDefsResponse = await axios.get(`/api/v0/taskDef?filter=id->${JSON.stringify(taskDefIds)}`);
      const jobDefIds = uniq(taskDefsResponse.data.data.map(taskDef => taskDef._jobDefId));

      const jobDefsResponse = await axios.get(`/api/v0/jobDef?filter=id->${JSON.stringify(jobDefIds)}`);
      this.scriptJobUsage = jobDefsResponse.data.data.map(jobDef => ({ id: jobDef.id, name: jobDef.name }));
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading = false;
    }
  }
}
</script>

<style lang="scss">
.spinner {
  @include loader;

  display: inline-block;
}
</style>
