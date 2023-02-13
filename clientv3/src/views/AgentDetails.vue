<template>
    <div class="sg-container-p">
        <tabs>
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
                                        v-model="name"
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
                                <input type="checkbox" style="margin-left: 10px" v-model="selectedHandleGeneralTasks" />
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
                                ></job-def-search>
                            </td>
                        </tr>
                        <tr class="tr">
                            <td class="td">Inactive Job Vars</td>
                            <td class="td">
                                <validation-provider name="RuntimeVars" rules="variable-map" v-slot="{ errors }">
                                    <!-- <input
                                        class="input"
                                        type="text"
                                        style="width: 300px; margin-left: 10px"
                                        v-model="selectedInactiveAgentJobDefRuntimeVars"
                                        @change="selectedInactiveAgentJobDefRuntimeVarsChanged"
                                        :disabled="selectedAgents.length === 0"
                                        placeholder="key=val,key=val"
                                    /> -->
                                    <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                                        {{ errors[0] }}
                                    </div>
                                </validation-provider>
                            </td>
                        </tr>
                        <tr class="tr">
                            <td class="td"></td>
                            <td class="td">
                                <button class="button is-primary" @click="onAgentSave">Save</button>
                                <button class="button" style="margin-left: 12px" @click="onCancel">Cancel</button>
                            </td>
                        </tr>
                    </table>
                </validation-observer>
            </tab>
            <tab title="System Information">
                <div class="sg-container-px">
                    <p class="my-5">System information for the selected agent</p>
                    <div>
                        <pre>{{ agent.sysInfo || '' }}</pre>
                    </div>
                </div>
            </tab>
            <tab title="Tags">
                <div class="sg-container-p">
                    <table class="table">
                        <tr v-if="selectedAgentTags.length === 0">
                            <td colspan="2">Agent has no tags</td>
                        </tr>
                        <tr v-for="tag in selectedAgentTags" :key="tag">
                            <td>{{ tag }}</td>
                            <td>
                                <a href="#" class="button is-ghost" @click.prevent="onDeleteTagClicked(tag)">Delete</a>
                            </td>
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
        </tabs>
    </div>
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from 'vee-validate';
import { Component, Vue } from 'vue-property-decorator';
import { Tabs, Tab } from "vue-slim-tabs";
import _ from 'lodash';

import { AlertCategory, AlertPlacement, SgAlert } from '@/store/alert/types';
import { BindSelectedCopy, BindSelected, BindProp } from '@/decorator';
import JobDefSearch from "@/components/JobDefSearch.vue";
import { showErrors } from '@/utils/ErrorHandler';
import { JobDef } from '@/store/jobDef/types';
import { Agent } from '@/store/agent/types';
import { StoreType } from '@/store/types';

@Component({
    components: { JobDefSearch, ValidationObserver, ValidationProvider, Tabs, Tab },
    name: 'AgentDetails',
})
export default class AgentDetails extends Vue {
    @BindSelectedCopy({ storeType: StoreType.AgentStore })
    public readonly agent: Agent;

    @BindSelected({ storeType: StoreType.AgentStore })
    public readonly agentOrig: Agent;

    @BindProp({ storeType: StoreType.AgentStore })
    public name: string;

    private newTagKey = '';
    private newTagValue = '';

    public get selectedMaxActiveTasks(): string {
        return this.agent.propertyOverrides['maxActiveTasks'];
    }

    public set selectedMaxActiveTasks(maxActiveTasks: string) {
        this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, {
            propertyOverrides: {
                ...this.agent.propertyOverrides,
                maxActiveTasks,
            },
        });
    }

    private get selectedHandleGeneralTasks(): boolean {
        return this.agent.propertyOverrides['handleGeneralTasks'];
    }

    private set selectedHandleGeneralTasks(handleGeneralTasks: boolean) {
        this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, {
            propertyOverrides: {
                ...this.agent.propertyOverrides,
                handleGeneralTasks,
            },
        });
    }

    private get selectedInactiveAgentTimeout(): string {
        return this.agent.propertyOverrides['inactivePeriodWaitTime'];
    }

    private set selectedInactiveAgentTimeout(inactivePeriodWaitTime: string) {
        this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, {
            propertyOverrides: {
                ...this.agent.propertyOverrides,
                inactivePeriodWaitTime,
            },
        });
    }

    private get selectedAgentTags(): string[] {
        const tags = this.agent.tags;
        const tagKeyValues: string[] = [];

        for (let tagKey of Object.keys(tags)) {
            tagKeyValues.push(`${tagKey}=${tags[tagKey]}`);
        }

        return tagKeyValues;
    }

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

    private selectedInactiveAgentJobDefId = '';

    private onJobDefPicked(jobDef: JobDef) {
        this.selectedInactiveAgentJobDefId = jobDef ? jobDef.id : '';

        const inactiveAgentJob = this.agent.inactiveAgentJob
            ? { ...this.agent.inactiveAgentJob, id: this.selectedInactiveAgentJobDefId }
            : { id: this.selectedInactiveAgentJobDefId, runtimeVars: {} };

        this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, {
            propertyOverrides: {
                ...this.agent.propertyOverrides,
                inactiveAgentJob,
            },
        });
    }

    private async onAgentSave() {
        try {
            if (!(await (<any>this.$refs.agentSettingsValidationObserver).validate())) {
                return;
            }

            const savePromises = [];
            const properties = {
                maxActiveTasks: this.agent.propertyOverrides.maxActiveTasks,
                handleGeneralTasks: this.agent.propertyOverrides.handleGeneralTasks,
                inactivePeriodWaitTime: this.agent.propertyOverrides.inactivePeriodWaitTime,
                inactiveAgentJob: this.agent.propertyOverrides.inactiveAgentJob,
            };

            if (this.agent.name !== this.agentOrig.name) {
                savePromises.push(
                    this.$store.dispatch(`${StoreType.AgentStore}/saveName`, {
                        id: this.agent.id,
                        name: this.agent.name,
                    })
                );
            }

            savePromises.push(
                this.$store.dispatch(`${StoreType.AgentStore}/saveSettings`, { id: this.agent.id, properties })
            );

            await Promise.all(savePromises);

            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert('Saved agent settings.', AlertPlacement.WINDOW, AlertCategory.INFO)
            );
            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert('Saved agent settings.', AlertPlacement.FOOTER, AlertCategory.INFO)
            );
        } catch (err) {
            console.error(err);
            showErrors('Error saving agent settings.', err);
        }
    }

    private onCancel(): void {
        this.$router.push({ name: 'agentMonitor' });
        this.$store.dispatch(`${StoreType.AgentStore}/select`, null);
    }

    private async onAddTagClicked() {
        const tagValue = this.newTagValue.trim();
        const tagKey = this.newTagKey.trim();

        if (tagValue && tagKey) {
            await this.$store.dispatch(`${StoreType.AgentStore}/saveTags`, {
                id: this.agent.id,
                tags: Object.assign(
                    {},
                    {
                        ...this.agent.tags,
                        tagKey: tagValue,
                    }
                ),
            });

            this.newTagValue = '';
            this.newTagKey = '';

            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert('Saved agent tags.', AlertPlacement.FOOTER, AlertCategory.INFO)
            );
        }
    }

    private async onDeleteTagClicked(tag: string) {
        // the tag should be in key=value format because it will come from the template above
        const [tagName] = tag.split('=');
        const tags = { ...this.agent.tags };

        delete tags[tagName];

        await this.$store.dispatch(`${StoreType.AgentStore}/saveTags`, {
            id: this.agent.id,
            tags,
        });

        this.$store.dispatch(
            `${StoreType.AlertStore}/addAlert`,
            new SgAlert('Saved agent tags.', AlertPlacement.FOOTER, AlertCategory.INFO)
        );
    }
}
</script>

<style src="vue-slim-tabs/themes/default.css"></style>

<style lang="scss" scoped>
:deep(.vue-tablist) {
    padding: 0 64px;
}
</style>