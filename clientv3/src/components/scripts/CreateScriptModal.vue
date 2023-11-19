<template>
  <ValidationObserver ref="observer" v-slot="{ invalid }">
    <ModalCard>
      <template #title>Create a new script</template>
      <template #body>
        <ValidationProvider tag="div" class="field is-horizontal" name="Script Name" rules="required|object-name"
          v-slot="{ errors }">
          <div class="field-label">
            <label class="label">Script Name</label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input placeholder="Enter the script name" class="input" type="text" @keyup.enter="onCreate"
                  v-model="scriptName" v-focus />
              </div>
              <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
            </div>
          </div>
        </ValidationProvider>

        <div class="field is-horizontal">
          <div class="field-label">
            <label class="label">Script Type</label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <div class="select is-fullwidth">
                  <select v-model="scriptType">
                    <option v-for="(value, key) in scriptTypesForMonaco" :key="`scriptType${key}-${value}`" :value="key">
                      {{ value }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <button class="button is-primary" :class="{'is-loading': isLoading}" :disabled="invalid || isLoading" @click="onCreate">Create</button>
        <button class="button" @click="$emit('close')">Cancel</button>
      </template>
    </ModalCard>
  </ValidationObserver>
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from 'vee-validate';
import { Component, Vue } from "vue-property-decorator";

import { ScriptType, scriptTypesForMonaco } from '@/store/script/types';
import { AlertPlacement, SgAlert } from "@/store/alert/types";
import ModalCard from "@/components/core/ModalCard.vue";
import { showErrors } from "@/utils/ErrorHandler";
import { StoreType } from "@/store/types";
import { focus } from '@/directive';

@Component({
  name: "CreateScriptModal",
  components: { ModalCard, ValidationObserver, ValidationProvider },
  directives: { focus }
})
export default class CreateScriptModal extends Vue {
  public scriptTypesForMonaco = scriptTypesForMonaco;
  public scriptType: ScriptType = ScriptType.PYTHON;
  public scriptName: string = '';
  public isLoading = false;

  public async onCreate() {
    this.$store.dispatch(
      `${StoreType.AlertStore}/addAlert`,
      new SgAlert(
        `Creating script - ${this.scriptName}`,
        AlertPlacement.FOOTER
      )
    );

    try {
      this.isLoading = true;

      const { id } = await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {
        script: {
          name: this.scriptName,
          scriptType: this.scriptType,
          code: '',
          shadowCopyCode: '',
          lastEditedDate: new Date().toISOString()
        }
      });

      this.$parent.$emit('script:create', id);
      this.$emit('close');
    } catch (err) {
      console.error(err);
      showErrors('Error creating script', err);
    } finally {
      this.isLoading = false;
    }
  }
}
</script>
