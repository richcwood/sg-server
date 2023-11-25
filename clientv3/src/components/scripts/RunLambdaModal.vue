<template>
  <ModalCard>
    <template #title>Run Settings</template>
    <template #body>
      <ValidationObserver tag="div" ref="observer">
        <IsFreeTier>
          <template #yes>
            <div class="notification is-warning">
              <router-link to="/invoices" activeClass="">Upgrate</router-link> to start running SaaSGlue scripts
              on AWS Lambda.
            </div>
          </template>
          <template #no></template>
        </IsFreeTier>

        <div class="field is-horizontal">
          <div class="field-label">
            <label class="label">Lambda Runtime</label>
          </div>
          <div class="field-body">
            <div class="control">
              <div class="select">
                <ValidationProvider name="Lambda Runtime" rules="required" v-slot="{ errors }">
                  <LambdaRuntimeSelect v-model="lambdaRuntime" :scriptType="scriptType" />
                  <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                </ValidationProvider>
              </div>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label">
            <label class="label">Lambda Memory Size</label>
          </div>
          <div class="field-body">
            <div class="control">
              <div class="select">
                <select v-model="lambdaMemory">
                  <option v-for="memSize in LambdaMemorySizes" :key="memSize" :value="memSize">
                    {{ memSize }} mb
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <ValidationProvider tag="div" class="field is-horizontal" name="Lambda Timeout" rules="required|lambdaTimeout"
          v-slot="{ errors }">
          <div class="field-label">
            <label class="label">Lambda Timeout (seconds)</label>
          </div>
          <div class="field-body">
            <div class="control">
              <input class="input" v-model="lambdaTimeout" />
              <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
            </div>
          </div>
        </ValidationProvider>

        <div class="field is-horizontal">
          <div class="field-label">
            <label class="label">Lambda Dependencies</label>
          </div>
          <div class="field-body">
            <div class="control">
              <input class="input" v-model="lambdaDependencies" placeholder="compression;axios" />
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label">
            <label class="label">Command</label>
          </div>
          <div class="field-body">
            <div class="control">
              <input class="input" type="text" v-model="runScriptCommand" placeholder="Empty" />
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label">
            <label class="label">Arguments</label>
          </div>
          <div class="field-body">
            <div class="control">
              <input class="input" type="text" v-model="runScriptArguments" placeholder="Empty" />
            </div>
          </div>
        </div>

        <ValidationProvider name="Env Vars" rules="variable-map" v-slot="{ errors }">
          <div class="field is-horizontal">
            <div class="field-label">
              <label class="label">Env Variables</label>
            </div>
            <div class="field-body">
              <div class="control">
                <input class="input" type="text" v-model="runScriptEnvVars" placeholder="Empty" />
              </div>
            </div>
          </div>
          <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
        </ValidationProvider>

        <h2 class="is-size-5 my-4 has-text-centered">Runtime Variables</h2>
        <VariableList class="my-3" v-model="runScriptRuntimeVars" />
      </ValidationObserver>
    </template>

    <template #footer>
      <IsFreeTier>
        <template #yes>
          <button :disabled="true" class="button is-primary">Run</button>
        </template>
        <template #no>
          <button :disabled="isRunning" :class="{ 'is-loading': isRunning }" class="button is-primary"
            @click="onRun">Run</button>
        </template>
      </IsFreeTier>
      <button :disabled="isRunning" class="button" @click="onClose">Cancel</button>
    </template>
  </ModalCard>
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from 'vee-validate';
import { Component, Prop, Vue } from "vue-property-decorator";

import { LambdaMemorySizes, LambdaRuntimes } from '@/store/stepDef/types';
import VariableList from "@/components/runtimeVariable/VariableList.vue";
import LambdaRuntimeSelect from '@/components/LambdaRuntimeSelect.vue';
import { VariableMap } from "@/components/runtimeVariable/types";
import { ScriptShadow } from '@/store/scriptShadow/types';
import ModalCard from "@/components/core/ModalCard.vue";
import { TaskDefTarget } from "@/store/taskDef/types";
import IsFreeTier from '@/components/IsFreeTier.vue';
import { showErrors } from '@/utils/ErrorHandler';
import { ScriptType } from '@/store/script/types';
import { StoreType } from '@/store/types';

@Component({
  name: "RunLambdaModal",
  components: { ModalCard, VariableList, ValidationObserver, ValidationProvider, IsFreeTier, LambdaRuntimeSelect },
})
export default class RunLambdaModal extends Vue {
  @Prop({ required: true }) public readonly scriptShadow: ScriptShadow;
  @Prop({ required: true }) public readonly scriptType: ScriptType;

  public readonly LambdaMemorySizes = LambdaMemorySizes;
  public runScriptRuntimeVars: VariableMap = null;
  public readonly TaskDefTarget = TaskDefTarget;
  public lambdaRuntime: LambdaRuntimes = null;
  public runScriptArguments: string = '';
  public runScriptCommand: string = '';
  public runScriptEnvVars: string = '';
  public lambdaDependencies: string = '';
  public lambdaTimeout: number = 3;
  public lambdaMemory: number = 128;
  public isRunning = false;

  $refs: {
    observer: InstanceType<typeof ValidationObserver>;
  };

  public async onRun() {
    if (!await this.$refs.observer.validate()) {
      return;
    }

    if (!this.scriptShadow) {
      console.error("Script shadow was not loaded so it could not be run.");
      return;
    }

    try {
      this.isRunning = true;
      this.$parent.$emit('job:running');

      const data = await this.$store.dispatch(`${StoreType.JobStore}/runICJob`, {
        scriptType: ScriptType[this.scriptType] as any as ScriptType,
        code: this.scriptShadow.shadowCopyCode,
        runScriptCommand: this.runScriptCommand,
        runScriptArguments: this.runScriptArguments,
        runScriptEnvVars: this.runScriptEnvVars,
        runScriptRuntimeVars: this.runScriptRuntimeVars,
        runAgentTarget: TaskDefTarget.AWS_LAMBDA,
        lambdaDependencies: this.lambdaDependencies,
        lambdaMemory: this.lambdaMemory,
        lambdaRuntime: this.lambdaRuntime,
        lambdaTimeout: this.lambdaTimeout,
      });

      this.isRunning = false;
      this.$parent.$emit('job:completed', data.id);
    } catch (err) {
      this.$parent.$emit('job:failed');
      console.error(err);
      showErrors('Error running the script', err);
    } finally {
      this.isRunning = false;
    }

    this.onClose();
  }

  public onClose() {
    this.$emit('close');
  }
}
</script>

<style lang="scss" scoped>
.field-label {
  flex-basis: 220px;
  flex-grow: 0;
}

::v-deep .modal-card {
  width: auto;
}
</style>
