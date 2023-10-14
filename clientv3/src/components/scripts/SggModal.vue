<template>
  <modal-card>
    <template #title>SGG: Saas Glue Global Variables</template>
    <template #body>
      <p class="notification is-info is-light">
        Insert SaaSGlue variables into your script. You can also type "sgg" in the editor for auto complete.
      </p>

      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Job Context</label>
        </div>
        <div class="field-body">
          <div class="control">
            <div class="select">
              <select v-model="selectedJobDef">
                <option :value="null">None</option>
                <option v-for="def in jobDefs" :key="def.id" :value="def">{{ def.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Job def variables -->
      <table class="table is-striped is-fullwidth">
        <tr v-if="!selectedJobDef" class="tr">
          <td class="td">
            <p class="notification is-info is-light">
              Select a job to see it's available variables.
            </p>
          </td>
        </tr>
        <template v-else-if="selectedJobDef.runtimeVars && Object.keys(selectedJobDef.runtimeVars).length > 0">
          <tr class="tr">
            <td class="td" colspan="3">
              Variables available to job <strong>{{ selectedJobDef.name }}</strong>
            </td>
          </tr>
          <tr class="tr" v-for="(varValue, varKey) in selectedJobDef.runtimeVars" :key="varKey">
            <td class="td">
              <a href="#" @click.prevent="onClickedJobDefVar(varKey)">{{ varKey }}</a>
            </td>
            <td class="td">
              <span style="font-weight: 700; size: 20px;">=</span>
            </td>
            <td class="td">{{ varValue }}</td>
          </tr>
        </template>
        <tr v-else="selectedJobDef" class="tr">
          <td class="td">
            <p class="notification is-info is-light">
              There are no variables for the selected job.
            </p>
          </td>
        </tr>
      </table>

      <!-- Team / team variables -->
      <table class="table is-striped is-fullwidth">
        <tr class="tr" v-if="teamVars.length === 0">
          <td class="td">
            There are no variables for your team yet.
          </td>
        </tr>
        <tr class="tr" v-else>
          <td class="td" colspan="3">
            Variables available to your team
          </td>
        </tr>
        <tr class="tr" v-for="teamVar in teamVars" :key="teamVar.id">
          <td class="td">
            <a href="#" @click.prevent="onClickedTeamVar(teamVar)">{{ teamVar.name }}</a>
          </td>
          <td class="td">
            <span style="font-weight: 700; size: 20px;">=</span>
          </td>
          <td class="td">{{ teamVar.value }}</td>
        </tr>
      </table>
    </template>

    <template #footer>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import * as monaco from "monaco-editor";

import { BindSelected, BindStoreModel } from "@/decorator";
import ModalCard from "@/components/core/ModalCard.vue";
import { TeamVar } from "@/store/teamVar/types";
import { JobDef } from "@/store/jobDef/types";
import { StoreType } from "@/store/types";

@Component({
  name: "SggModal",
  components: { ModalCard },
})
export default class SggModal extends Vue {
  @Prop({ required: true }) public readonly editor: monaco.editor.IStandaloneCodeEditor;

  @BindStoreModel({ storeType: StoreType.TeamVariableStore, selectedModelName: 'models' })
  public teamVars: TeamVar[];

  @BindStoreModel({ storeType: StoreType.JobDefStore, selectedModelName: 'models' })
  public jobDefs: JobDef[];

  @BindSelected({ storeType: StoreType.JobDefStore })
  public jobDef: JobDef;

  public selectedJobDef: JobDef = null;

  @Watch('jobDef')
  private onJobDefChange() {
    this.selectedJobDef = this.jobDef;
  }

  public onClickedJobDefVar(varKey: string | number) {
    this.editor.trigger('keyboard', 'type', { text: `@sgg("${varKey}")` });
    this.$emit('close');
  }

  public onClickedTeamVar(teamVar: TeamVar) {
    this.editor.trigger('keyboard', 'type', { text: `@sgg("${teamVar.name}")` });
    this.$emit('close');
  }
}
</script>
