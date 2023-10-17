<template>
  <modal-card>
    <template #title>Delete {{ script.name }} script</template>
    <template #body>
      <p>
        Are you sure you want to delete the script <b>{{script.name}}</b>?
      </p>
    </template>
    <template #footer>
      <button class="button is-danger" :class="{ 'is-loading': isDeliting }" :disabled="isDeliting"
        @click="onDeleteScript">Delete Script</button>
      <button class="button button-spaced" @click="onClose">Cancel</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { AlertPlacement, SgAlert } from "@/store/alert/types";
import ModalCard from "@/components/core/ModalCard.vue";
import { showErrors } from "@/utils/ErrorHandler";
import { Script } from '@/store/script/types';
import { StoreType } from "@/store/types";

@Component({
  name: "DeleteScriptModal",
  components: { ModalCard },
})
export default class DeleteScriptModal extends Vue {
  @Prop({ required: true }) public readonly script: Script;

  public isDeliting: boolean = false;

  public async onDeleteScript() {
      try {
        this.isDeliting = true;

        await this.$store.dispatch(`${StoreType.ScriptStore}/delete`, this.script);
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script deleted`, AlertPlacement.FOOTER));
      } catch(err) {
        console.error(err);
        showErrors(`Error deleting the script.`, err);
      } finally {
        this.isDeliting = false;

        this.onClose();
      }
  }

  public onClose() {
    this.$emit('close');
  }
}
</script>
