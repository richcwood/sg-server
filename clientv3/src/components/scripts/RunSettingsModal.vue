<template>
  <ModalCard>
    <template #title>Run Settings</template>
    <template #body>
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
            <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
              {{ errors[0] }}
            </div>
          </ValidationProvider>
        </div>
      </div>



      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Command</label>
        </div>
        <div class="field-body">
          <div class="control">
            <input class="input" type="text" v-model="runScriptCommand" />
          </div>
        </div>
      </div>

      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Arguments</label>
        </div>
        <div class="field-body">
          <div class="control">
            <input class="input" type="text" v-model="runScriptArguments" />
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
              <input class="input" type="text" v-model="runScriptEnvVars" />
            </div>
          </div>
        </div>
        <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
      </ValidationProvider>

      <h2 class="is-size-5 my-4 has-text-centered">Runtime Variables</h2>
      <VariableList class="my-3" v-model="runScriptRuntimeVars" />
    </template>
    <template #footer>
      <button class="button is-primary" @click="onRun">Run</button>
      <button class="button" @click="$emit('close')">Cancel</button>
    </template>
  </ModalCard>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { ValidationProvider } from 'vee-validate';

import VariableList from "../runtimeVariable/VariableList.vue";
import ModalCard from "@/components/core/ModalCard.vue";
import { VariableMap } from "../runtimeVariable/types";
import { TaskDefTarget } from "@/store/taskDef/types";
import AgentSearch from "../AgentSearch.vue";
import { Agent } from "@/store/agent/types";

@Component({
  name: "RunSettingsModal",
  components: { ModalCard, VariableList, ValidationProvider, AgentSearch },
})
export default class RunSettingsModal extends Vue {
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

  public onRun() {

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
