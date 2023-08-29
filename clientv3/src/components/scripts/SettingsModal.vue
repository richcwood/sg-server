<template>
  <modal-card>
    <template #title>Editor Settings</template>
    <template #body>
      <div>
        <p>
          <select class="input select button-spaced" style="width: 150px;" v-model="derivedTheme">
            <option value="vs">Light</option>
            <option value="vs-dark">Dark</option>
            <option value="hc-black">Black</option>
          </select>
        </p>
        <p>
          <select :disabled="scriptTypeDisabled" class="input select button-spaced"
            style="width: 250px; margin-bottom: 10px;" v-model="derivedScriptType">
            <option v-for="(value, key) in scriptTypesForMonaco" :key="`scriptType${key}-${value}`" :value="key">
              {{ value }}
            </option>
          </select>
        </p>
      </div>
    </template>
    <template #footer>
      <button class="button" @click="onSave">Save</button>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { EditorTheme, ScriptType, scriptTypesForMonaco } from '@/store/script/types';
import ModalCard from "@/components/core/ModalCard.vue";

@Component({
  name: "SettingsModal",
  components: { ModalCard },
})
export default class SettingsModal extends Vue {
  @Prop({ default: false }) public readonly scriptTypeDisabled: boolean;
  @Prop({ required: true }) public readonly scriptType: ScriptType;
  @Prop({ required: true }) public readonly theme: EditorTheme;

  public scriptTypesForMonaco = scriptTypesForMonaco;
  public derivedScriptType: ScriptType = null;
  public derivedTheme: EditorTheme = null;

  public created () {
    this.derivedScriptType = this.scriptType;
    this.derivedTheme = this.theme;
  }

  public onSave () {
    this.$parent.$emit('save', {
      scriptType: this.scriptType,
      theme: this.theme,
    });
    this.$emit('close');
  }
}
</script>

<style lang="scss" scoped></style>
