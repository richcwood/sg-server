<template>
  <modal-card>
    <template #title>Rename the script {{ script.name }}</template>
    <template #body>
      <ValidationObserver ref="renameScriptValidationObserver">
        <ValidationProvider name="Script Name" rules="required|object-name" v-slot="{ errors }">
          <div class="field">
            <label class="label">New name</label>
            <div class="control">
              <input class="input" type="text" v-model="scriptName" />
            </div>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </ValidationProvider>
      </ValidationObserver>
    </template>
    <template #footer>
      <button class="button is-primary" :class="{'is-loading': isSaving}" :disabled="isSaveDisabled" @click="onRenameScript">Rename Script</button>
      <button class="button" @click="onClose">Cancel</button>
    </template>
  </modal-card>
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from "vee-validate";
import { Component, Vue, Prop } from "vue-property-decorator";

import { AlertPlacement, SgAlert } from "@/store/alert/types";
import ModalCard from "@/components/core/ModalCard.vue";
import { showErrors } from "@/utils/ErrorHandler";
import { Script } from '@/store/script/types';
import { StoreType } from "@/store/types";

@Component({
  name: "RenameScriptModal",
  components: { ModalCard, ValidationObserver, ValidationProvider },
})
export default class RenameScriptModal extends Vue {
  @Prop({ required: true }) public readonly script: Script;

  public isSaving: boolean = false;
  public scriptName: string = '';

  $refs: {
    renameScriptValidationObserver: InstanceType<typeof ValidationObserver>;
  };

  public get isSaveDisabled() {
    return this.isSaving || this.script.name === this.scriptName.trim();
  }

  public created() {
    this.scriptName = this.script.name;
  }

  public async onRenameScript() {
    if (await this.$refs.renameScriptValidationObserver.validate()) {
      try {
        this.isSaving = true;

        await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {
          script: {
            id: this.script.id,
            name: this.scriptName.trim(),
          }
        });

        this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Script name updated`, AlertPlacement.FOOTER));
      } catch (err) {
        console.error(err);
        showErrors(`Error renaming the script.`, err);
      } finally {
        this.isSaving = false;

        this.onClose();
      }
    }
  }

  public onClose() {
    this.$emit('close');
  }
}
</script>
