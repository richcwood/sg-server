<template>
  <modal-card>
    <template #title>Revert {{ script.name }} Changes</template>
    <template #body>
      <p class="notification is-warning">
        <strong>Warning.</strong> Do you really want to undo all of your changes?
      </p>
    </template>

    <template #footer>
      <button class="button is-primary" @click="onRevertChanges">Revert</button>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { AlertPlacement, SgAlert } from "@/store/alert/types";
import { ScriptShadow } from "@/store/scriptShadow/types";
import ModalCard from "@/components/core/ModalCard.vue";
import { showErrors } from "@/utils/ErrorHandler";
import { Script } from "@/store/script/types";
import { StoreType } from "@/store/types";

@Component({
  name: "RevertChangesModal",
  components: { ModalCard },
})
export default class RevertChangesModal extends Vue {
  @Prop({ required: true }) public readonly scriptShadow: ScriptShadow;
  @Prop({ required: true }) public readonly script: Script;

  public async onRevertChanges() {
    try {
      if (this.script && this.scriptShadow) {
        //revert the shadow copy
        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Reverting script - ${this.script.name}`, AlertPlacement.FOOTER));

        await this.$store.dispatch(`${StoreType.ScriptShadowStore}/save`, {
          shadowCopyCode: this.script.code,
          id: this.scriptShadow.id,
        });

        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script reverted`, AlertPlacement.FOOTER));
      }
    } catch (err) {
      console.error(err);
      showErrors('Error reverting script changes', err);
    } finally {
      this.$emit('close');
    }
  }
}
</script>
