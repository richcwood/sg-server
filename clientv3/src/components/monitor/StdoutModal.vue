<template>
  <modal-card>
    <template #title> Stdout for step: {{ stepOutcome.name }} </template>
    <template #body>
      <div v-if="stepOutcome.stdout" v-html="formatStdString(stepOutcome.stdout)"></div>
      <div v-else>
        No stdout available yet...
      </div>
    </template>
    <template #footer>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { StepOutcome } from "@/store/stepOutcome/types";
import ModalCard from "@/components/core/ModalCard.vue";

@Component({
  name: "StdoutModal",
  components: { ModalCard },
})
export default class StdoutModal extends Vue {
  @Prop({ required: false })
  public stepOutcome: StepOutcome;

  private formatStdString(std: string): string {
    if (std) {
      return std
        .replace(/</g, "&#60;")
        .replace(/>/g, "&#62;")
        .split("\n")
        .reverse()
        .join("<br>");
    } else {
      return "";
    }
  }
}
</script>

<style lang="scss" scoped>
::v-deep .modal-card-body,
::v-deep pre {
  background: var(--code-background-color);
  color: white;
}
</style>
