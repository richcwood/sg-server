<template>
    <div class="sg-container-p">
        Hi there
    </div>

    <!-- <tabs class="mt-2">
        <tab title="Settings">
            <validation-observer tag="div" class="sg-container-px" ref="agentSettingsValidationObserver">
                <table class="table" style="width: 575px; margin-top: 10px">
                    <tr class="tr">
                        <td class="td">Agent name</td>
                        <td class="td">
                            <validation-provider name="Agent Name" rules="agent-name" v-slot="{ errors }">
                                <input
                                    class="input"
                                    type="text"
                                    style="width: 300px; margin-left: 10px"
                                    v-model="agentName"
                                />
                                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                                    {{ errors[0] }}
                                </div>
                            </validation-provider>
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td">Max Active Tasks</td>
                        <td class="td">
                            <validation-provider
                                name="Max Active Tasks"
                                rules="agent-positiveNumber"
                                v-slot="{ errors }"
                            >
                                <input
                                    class="input"
                                    type="text"
                                    style="width: 300px; margin-left: 10px"
                                    v-model="selectedMaxActiveTasks"
                                />
                                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                                    {{ errors[0] }}
                                </div>
                            </validation-provider>
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td">Handle General Tasks</td>
                        <td class="td">
                            <input
                                type="checkbox"
                                style="margin-left: 10px"
                                v-model="selectedHandleGeneralTasks"
                                :disabled="selectedAgents.length === 0"
                            />
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td">Inactive Agent Timeout (ms)</td>
                        <td class="td">
                            <validation-provider
                                name="Inactive Agent Timeout(ms)"
                                rules="agent-positiveNumber"
                                v-slot="{ errors }"
                            >
                                <input
                                    class="input"
                                    type="text"
                                    style="width: 300px; margin-left: 10px"
                                    v-model="selectedInactiveAgentTimeout"
                                    :disabled="selectedAgents.length === 0"
                                />
                                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                                    {{ errors[0] }}
                                </div>
                            </validation-provider>
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td">Inactive Agent Job</td>
                        <td class="td">
                            <job-def-search
                                :jobDefId="selectedInactiveAgentJobDefId"
                                @jobDefPicked="onJobDefPicked"
                                :disabled="selectedAgents.length === 0"
                            ></job-def-search>
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td">Inactive Job Vars</td>
                        <td class="td">
                            <validation-provider name="RuntimeVars" rules="variable-map" v-slot="{ errors }">
                                <input
                                    class="input"
                                    type="text"
                                    style="width: 300px; margin-left: 10px"
                                    v-model="selectedInactiveAgentJobDefRuntimeVars"
                                    @change="selectedInactiveAgentJobDefRuntimeVarsChanged"
                                    :disabled="selectedAgents.length === 0"
                                    placeholder="key=val,key=val"
                                />
                                <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                                    {{ errors[0] }}
                                </div>
                            </validation-provider>
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td"></td>
                        <td class="td">
                            <button
                                class="button is-primary"
                                @click="onSaveSettingsClicked"
                                :disabled="selectedAgents.length === 0"
                            >
                                Save
                            </button>
                            <button
                                class="button"
                                style="margin-left: 12px"
                                @click="onCancelSettingsClicked"
                                :disabled="selectedAgents.length === 0"
                            >
                                Cancel
                            </button>
                        </td>
                    </tr>
                </table>
            </validation-observer>
        </tab>
        <tab title="System Information">
            <div class="sg-container-px">
                <p class="my-5">System information for the selected agent (nothing if multiple agents selected)</p>
                <div v-if="selectedAgent">
                    <pre>{{ selectedAgent.sysInfo || '' }}</pre>
                </div>
                <p v-else class="is-size-4 has-text-centered">Please select an agent</p>
            </div>
        </tab>
        <tab title="Tags">
            <div class="sg-container-p">
                <p v-if="selectedAgents.length === 0" class="is-size-4 has-text-centered">No agents selected</p>
                <table v-else class="table">
                    <tr v-if="selectedAgentTags.length === 0">
                        <td colspan="2">No common tags for selected agents</td>
                    </tr>
                    <tr v-for="tag in selectedAgentTags" :key="tag">
                        <td>{{ tag }}</td>
                        <td><a href="#" class="button is-ghost" @click.prevent="onDeleteTagClicked(tag)">Delete</a></td>
                    </tr>
                    <tr>
                        <td colspan="2"></td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <input
                                class="input"
                                type="text"
                                style="width: 125px"
                                v-model="newTagKey"
                                placeholder="key"
                            />
                            <span class="has-text-weight-bold mx-3">=</span>
                            <input
                                class="input"
                                type="text"
                                style="width: 125px"
                                v-model="newTagValue"
                                placeholder="value"
                            />
                        </td>
                        <td>
                            <button class="button" @click="onAddTagClicked">Add tag to selected agents</button>
                        </td>
                    </tr>
                </table>
            </div>
        </tab>
    </tabs> -->
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from 'vee-validate';
import { Component, Vue } from 'vue-property-decorator';
import _ from 'lodash';

import { BindSelectedCopy } from "@/decorator";
import { Agent } from '@/store/agent/types';
import { StoreType } from '@/store/types';

@Component({
    components: { ValidationObserver, ValidationProvider },
})
export default class AgentDetails extends Vue {
    @BindSelectedCopy({ storeType: StoreType.AgentStore })
    public readonly agent: Agent;

    public mounted () {
        console.log(this.agent);
    }

    // private get selectedHandleGeneralTasks(): boolean {
    //     return this.getSelectedAgentsSharedPropertyOverride_boolean('handleGeneralTasks');
    // }

    // private set selectedHandleGeneralTasks(newValue: boolean) {
    //     this.setSelectedAgentsSharedPropertyOverride('handleGeneralTasks', <string>(<unknown>newValue));
    // }

    // private getSelectedAgentsSharedPropertyOverride_boolean(key: string): boolean {
    //     const value = this.getSelectedAgentsSharedPropertyOverride(key);
    //     return value === '<>' ? false : <boolean>(<unknown>value);
    // }

    // private get agentName(): string {
    //     const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    //     if (selectedAgentIds.length === 0) {
    //         return '';
    //     } else if (selectedAgentIds.length === 1) {
    //         return this.selectedAgentCopies[selectedAgentIds[0]].name;
    //     } else {
    //         return '<>';
    //     }
    // }

    // private set agentName(name: string) {
    //     const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    //     if (selectedAgentIds.length === 1) {
    //         this.selectedAgentCopies[selectedAgentIds[0]].name = name;
    //     }
    // }

    // private get selectedInactiveAgentTimeout(): string {
    //     return this.getSelectedAgentsSharedPropertyOverride('inactivePeriodWaitTime');
    // }

    // private set selectedInactiveAgentTimeout(newValue: string) {
    //     this.setSelectedAgentsSharedPropertyOverride('inactivePeriodWaitTime', newValue);
    // }

    // private get selectedMaxActiveTasks(): string {
    //     return this.getSelectedAgentsSharedPropertyOverride('maxActiveTasks');
    // }

    // private set selectedMaxActiveTasks(newValue: string) {
    //     this.setSelectedAgentsSharedPropertyOverride('maxActiveTasks', newValue);
    // }

    // private setSelectedAgentsSharedPropertyOverride(key: string, value: string) {
    //     const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    //     for (const selectedAgentId of selectedAgentIds) {
    //         this.selectedAgentCopies[selectedAgentId].propertyOverrides[key] = value;
    //     }
    // }

    // // The set of tags shared across all selected agents - tag must exist for all agents
    // private get selectedAgentTags(): string[] {
    //     const selectedAgentTags: string[][] = [];

    //     const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    //     for (let agentId of selectedAgentIds) {
    //         const tags = this.selectedAgentCopies[agentId].tags;
    //         const tagKeyValues: string[] = [];
    //         for (let tagKey of Object.keys(tags)) {
    //             tagKeyValues.push(`${tagKey}=${tags[tagKey]}`);
    //         }

    //         selectedAgentTags.push(tagKeyValues);
    //     }

    //     return _.intersection(...selectedAgentTags);
    // }

    // private selectedInactiveAgentJobDefRuntimeVars = '';

    // private selectedInactiveAgentJobDefRuntimeVarsChanged() {
    //     let newVariablesMap;
    //     try {
    //         newVariablesMap = tagsStringToMap(this.selectedInactiveAgentJobDefRuntimeVars);
    //     } catch (err) {
    //         console.log('variables not well formed', err);
    //         return;
    //     }

    //     const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    //     for (const selectedAgentId of selectedAgentIds) {
    //         const agentCopy = this.selectedAgentCopies[selectedAgentId];
    //         if (!agentCopy.propertyOverrides['inactiveAgentJob']) {
    //             agentCopy.propertyOverrides['inactiveAgentJob'] = {
    //                 id: '',
    //             };
    //         }

    //         agentCopy.propertyOverrides['inactiveAgentJob'].runtimeVars = newVariablesMap;
    //     }
    // }

    // private selectedInactiveAgentJobDefId = '';

    // private onJobDefPicked(jobDef: JobDef | undefined) {
    //     this.selectedInactiveAgentJobDefId = jobDef ? jobDef.id : '';

    //     const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    //     selectedAgentIds.map((selectedAgentId: string) => {
    //         const selectedAgentCopy = this.selectedAgentCopies[selectedAgentId];
    //         if (!selectedAgentCopy.propertyOverrides['inactiveAgentJob']) {
    //             selectedAgentCopy.propertyOverrides['inactiveAgentJob'] = {
    //                 id: this.selectedInactiveAgentJobDefId,
    //                 runtimeVars: {},
    //             };
    //         } else {
    //             selectedAgentCopy.propertyOverrides['inactiveAgentJob'].id = this.selectedInactiveAgentJobDefId;
    //         }
    //     });
    // }

    // private async onSaveSettingsClicked() {
    //     try {
    //         if (!(await (<any>this.$refs.agentSettingsValidationObserver).validate())) {
    //             return;
    //         }

    //         const savePromises = [];

    //         const selectedAgentIds = Object.keys(this.selectedAgentCopies);
    //         for (const selectedAgentId of selectedAgentIds) {
    //             const selectedAgent = this.selectedAgentCopies[selectedAgentId];
    //             const properties = {
    //                 maxActiveTasks: selectedAgent.propertyOverrides.maxActiveTasks,
    //                 handleGeneralTasks: selectedAgent.propertyOverrides.handleGeneralTasks,
    //                 inactivePeriodWaitTime: selectedAgent.propertyOverrides.inactivePeriodWaitTime,
    //                 inactiveAgentJob: selectedAgent.propertyOverrides.inactiveAgentJob,
    //             };

    //             // If there is only a single agent selected and the name has changed, update the name
    //             if (selectedAgentIds.length === 1 && this.selectedAgent) {
    //                 if (this.selectedAgent.name !== selectedAgent.name) {
    //                     savePromises.push(
    //                         this.$store.dispatch(`${StoreType.AgentStore}/saveName`, {
    //                             id: this.selectedAgent.id,
    //                             name: selectedAgent.name,
    //                         })
    //                     );
    //                 }
    //             }

    //             savePromises.push(
    //                 this.$store.dispatch(`${StoreType.AgentStore}/saveSettings`, { id: selectedAgentId, properties })
    //             );
    //         }
    //         await Promise.all(savePromises);

    //         this.$store.dispatch(
    //             `${StoreType.AlertStore}/addAlert`,
    //             new SgAlert('Saved agent settings.', AlertPlacement.WINDOW, AlertCategory.INFO)
    //         );
    //         this.$store.dispatch(
    //             `${StoreType.AlertStore}/addAlert`,
    //             new SgAlert('Saved agent settings.', AlertPlacement.FOOTER, AlertCategory.INFO)
    //         );
    //     } catch (err) {
    //         console.error(err);
    //         showErrors('Error saving agent settings.', err);
    //     }
    // }

    // private onCancelSettingsClicked() {
    //     // Need to update the copies used for mutations
    //     const newCopies = {};

    //     // Add new fresh copies
    //     for (const agent of this.selectedAgents) {
    //         newCopies[agent.id] = _.cloneDeep(agent);
    //     }

    //     // Need to do this to make the object reactive / change
    //     this.selectedAgentCopies = newCopies;
    // }

    // // Helper to get all of the selected tasks property override values if they are homogenous
    // private getSelectedAgentsSharedPropertyOverride(key: string): string | null {
    //     const selectedAgentIds = Object.keys(this.selectedAgentCopies);

    //     if (selectedAgentIds.length > 0) {
    //         const firstValue = this.selectedAgentCopies[selectedAgentIds[0]].propertyOverrides[key];

    //         if (
    //             selectedAgentIds
    //                 .map((agentId: string) => {
    //                     return this.selectedAgentCopies[agentId].propertyOverrides[key];
    //                 })
    //                 .every((val: string) => val === firstValue)
    //         ) {
    //             return firstValue;
    //         } else {
    //             return '<>'; // they don't all match
    //         }
    //     } else {
    //         return null;
    //     }
    // }

    // private async onAddTagClicked() {
    //     // TODO apply new tags to filtered list of agents
    //     // if (this.newTagKey.trim() && this.newTagValue.trim()) {
    //     //     this.updateSelectedAgentTags(UpdateTagType.ADD, this.newTagKey, this.newTagValue);
    //     // }
    // }

    // private onDeleteTagClicked(tag: string) {
    //     // TODO remove tags from filtered list of agents
    //     // the tag should be in key=value format because it will come from the template above
    //     // this.updateSelectedAgentTags(UpdateTagType.DELETE, tag.split('=')[0]);
    // }

    // private async updateSelectedAgentTags(updateType: any, tagKey: string, tagValue?: string) {
    //     // try {
    //     //     const agentIds = Object.keys(this.filteredAgents);
    //     //     const savePromises: Promise<any>[] = [];

    //     //     for (let agentId of agentIds) {
    //     //         const agentCopy: Agent = this.filteredAgents[agentId];

    //     //         if (updateType === UpdateTagType.ADD) {
    //     //             savePromises.push(
    //     //                 this.$store.dispatch('agentStore/saveTags', { id: agentId, tags: agentCopy.tags })
    //     //             );
    //     //         } else {
    //     //             if (agentCopy.tags[tagKey]) {
    //     //                 savePromises.push(
    //     //                     this.$store.dispatch('agentStore/saveTags', { id: agentId, tags: agentCopy.tags })
    //     //                 );
    //     //             } else {
    //     //                 console.error('Tried to remove a tag that did not exist on agent', tagKey, agentCopy.name);
    //     //             }
    //     //         }
    //     //     }

    //     //     await Promise.all(savePromises);

    //     //     this.$store.dispatch(
    //     //         `${StoreType.AlertStore}/addAlert`,
    //     //         new SgAlert('Saved agent tags.', AlertPlacement.FOOTER, AlertCategory.INFO)
    //     //     );

    //     //     if (updateType === UpdateTagType.ADD) {
    //     //         this.newTagKey = this.newTagValue = '';
    //     //     }
    //     // } catch (err) {
    //     //     console.error(err);
    //     //     showErrors('Error saving agent tags.', err);
    //     // }
    // }
}
</script>

<style lang="scss" scoped>
</style>