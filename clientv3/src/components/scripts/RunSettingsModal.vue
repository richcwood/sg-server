<template>
  <ModalCard>
    <template #title>Run Settings</template>
    <template #body>
      <ValidationObserver tag="div" ref="observer">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Target Agent(s)</label>
          </div>
          <div class="field-body">
            <div class="control">
              <div class="select">
                <select v-model="runAgentTarget">
                  <option v-for="(key, value) in targetAgentChoices" :key="`target-choice-${key}`" :value="key">
                    {{ value }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="field is-horizontal" v-if="runAgentTarget === TaskDefTarget.SINGLE_SPECIFIC_AGENT">
          <div class="field-label is-normal">
            <label class="label">Target Agent</label>
          </div>
          <div class="field-body">
            <div class="control">
              <AgentSearch :agentId="runAgentTargetAgentId" @agentPicked="onTargetAgentPicked" />
            </div>
          </div>
        </div>

        <div class="field is-horizontal" v-if="runAgentTarget === TaskDefTarget.ALL_AGENTS_WITH_TAGS ||
          runAgentTarget === TaskDefTarget.SINGLE_AGENT_WITH_TAGS">
          <div class="field-label is-normal">
            <label class="label">Target Agent Tags</label>
          </div>
          <div class="field-body">
            <ValidationProvider tag="div" class="control" name="Target Tags" rules="variable-map" v-slot="{ errors }">
              <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
              <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
              <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
              <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
              <input type="text" style="width: 350px;" class="input" v-model="runAgentTargetTags_string" />
              <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
            </ValidationProvider>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Command</label>
          </div>
          <div class="field-body">
            <div class="control">
              <input class="input" type="text" v-model="runScriptCommand" placeholder="Empty" />
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
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
            <div class="field-label is-normal">
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
      <button class="button is-primary" @click="onRun">Run</button>
      <button class="button" @click="$emit('close')">Cancel</button>
    </template>
  </ModalCard>
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from 'vee-validate';
import { Component, Prop, Vue } from "vue-property-decorator";

import VariableList from "../runtimeVariable/VariableList.vue";
import { ScriptShadow } from '@/store/scriptShadow/types';
import ModalCard from "@/components/core/ModalCard.vue";
import { VariableMap } from "../runtimeVariable/types";
import { TaskDefTarget } from "@/store/taskDef/types";
import { showErrors } from '@/utils/ErrorHandler';
import { ScriptType } from '@/store/script/types';
import AgentSearch from "../AgentSearch.vue";
import { Agent } from "@/store/agent/types";
import { StoreType } from '@/store/types';
import { AgentJobSettings } from './types';

@Component({
  name: "RunSettingsModal",
  components: { ModalCard, VariableList, ValidationObserver, ValidationProvider, AgentSearch },
})
export default class RunSettingsModal extends Vue {
  @Prop({ required: true }) public readonly scriptShadow: ScriptShadow;
  @Prop({ required: true }) public readonly scriptType: ScriptType;

  public runAgentTarget: TaskDefTarget = TaskDefTarget.SINGLE_AGENT;
  public runScriptRuntimeVars: VariableMap = null;
  public runAgentTargetTags_string: string = '';
  public readonly TaskDefTarget = TaskDefTarget;
  public runAgentTargetAgentId: string = null;
  public runScriptArguments: string = '';
  public runScriptCommand: string = '';
  public runScriptEnvVars: string = '';
  public readonly targetAgentChoices = {
    "Any Available Agent": TaskDefTarget.SINGLE_AGENT,
    "A Specific Agent": TaskDefTarget.SINGLE_SPECIFIC_AGENT,
    "A Single Agent With Tags": TaskDefTarget.SINGLE_AGENT_WITH_TAGS,
    "All Active Agents": TaskDefTarget.ALL_AGENTS,
    "All Active Agents With Tags": TaskDefTarget.ALL_AGENTS_WITH_TAGS,
  };

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
      this.$parent.$emit('job:running');

      console.log({
        scriptType: ScriptType[this.scriptType] as any as ScriptType,
        code: this.scriptShadow.shadowCopyCode,
        runScriptCommand: this.runScriptCommand,
        runScriptArguments: this.runScriptArguments,
        runScriptEnvVars: this.runScriptEnvVars,
        runAgentTarget: this.runAgentTarget,
        runScriptRuntimeVars: this.runScriptRuntimeVars,
        runAgentTargetTags_string: this.runAgentTargetTags_string,
        runAgentTargetAgentId: this.runAgentTargetAgentId,
      })

      await new Promise((res) => {
        setTimeout(() => res(true), 3000);
      });

      // await this.$store.dispatch(`${StoreType.JobStore}/runICJob`, {
      //   scriptType: ScriptType[this.scriptType] as any as ScriptType,
      //   code: this.scriptShadow.shadowCopyCode,
      //   runScriptCommand: this.runScriptCommand,
      //   runScriptArguments: this.runScriptArguments,
      //   runScriptEnvVars: this.runScriptEnvVars,
      //   runAgentTarget: this.runAgentTarget,
      //   runScriptRuntimeVars: this.runScriptRuntimeVars,
      //   runAgentTargetTags_string: this.runAgentTargetTags_string,
      //   runAgentTargetAgentId: this.runAgentTargetAgentId,
      // });
    } catch (err) {

      console.error(err);
      showErrors('Error running the script', err);
    } finally {
      this.$parent.$emit('job:completed');
    }

    this.onClose();
  }

  public onTargetAgentPicked(agent: Agent) {
    this.runAgentTargetAgentId = agent ? agent.id : null;
  }

  public onClose() {
    this.$emit('close');
  }
}
</script>

<style lang="scss" scoped>
.field-label {
  flex-basis: 130px;
  flex-grow: 0;
}

::v-deep .modal-card {
  width: auto;
}
</style>
