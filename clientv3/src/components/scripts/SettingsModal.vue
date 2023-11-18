<template>
  <modal-card>
    <template #title>Editor Settings</template>
    <template #body>
      <div class="field">
        <label class="label">Theme</label>
        <div class="control">
          <div class="select">
            <select v-model="themeCopy">
              <option value="vs">Light</option>
              <option value="vs-dark">Dark</option>
              <option value="hc-black">Black</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="label">Language</label>
        <div class="control">
          <div class="select">
            <select :disabled="scriptTypeDisabled" v-model="scriptTypeCopy">
              <option v-for="(value, key) in scriptTypesForMonaco" :key="`scriptType${key}-${value}`" :value="key">
                {{ value }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <span class="label">Team Members Can Edit</span>
        <div class="control">
          <label class="checkbox">
            <input type="checkbox" v-model="teamEditableCopy"
              :disabled="script._originalAuthorUserId !== loggedInUserId" />
          </label>
        </div>
      </div>
    </template>
    <template #footer>
      <button class="button is-primary" @click="onSave">Save</button>
      <button class="button" @click="$emit('close')">Close</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { EditorTheme, Script, ScriptType, scriptTypesForMonaco } from '@/store/script/types';
import { AlertPlacement, SgAlert } from "@/store/alert/types";
import ModalCard from "@/components/core/ModalCard.vue";
import { showErrors } from "@/utils/ErrorHandler";
import { StoreType } from "@/store/types";

@Component({
  name: "SettingsModal",
  components: { ModalCard },
})
export default class SettingsModal extends Vue {
  @Prop({ default: false }) public readonly scriptTypeDisabled: boolean;
  @Prop({ required: true }) public readonly theme: EditorTheme;
  @Prop({ required: true }) public readonly script: Script;

  public scriptTypesForMonaco = scriptTypesForMonaco;
  public teamEditableCopy: boolean = false;
  public scriptTypeCopy: ScriptType = null;
  public themeCopy: EditorTheme = null;

  public created() {
    this.teamEditableCopy = this.script.teamEditable;
    this.scriptTypeCopy = this.script.scriptType;
    this.themeCopy = this.theme;
  }

  public get loggedInUserId() {
    return this.$store.state[StoreType.SecurityStore].user.id;
  }

  public async onSave() {
    if (this.theme !== this.themeCopy) {
      this.$parent.$emit('theme:update', this.themeCopy);
    }

    try {
      await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {
        script: {
          teamEditable: this.teamEditableCopy,
          scriptType: this.scriptTypeCopy,
          id: this.script.id,
        }
      });

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script type updated`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors('Error updating the script type', err);
    } finally {
      this.$emit('close');
    }
  }
}
</script>
