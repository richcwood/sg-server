<template>
    <div class="sg-container-p">
        <header class="mb-5">
            <a href="#" @click.prevent="onNavigateToAgents" class="mr-5 is-size-5">
                <font-awesome-icon icon="chevron-left" class="mr-2" />
                <span>Back To Agents</span>
            </a>
            <a href="#" @click.prevent="onShowSystemInformation">Show System Infrormation</a>
        </header>
        <div class="columns is-variable is-5">
            <div class="column is-4">
                <h2 class="title">Settings</h2>
                <validation-observer tag="div" ref="agentSettingsValidationObserver">
                    <div class="field">
                        <label for="" class="label">Agent Name</label>
                        <validation-provider
                            tag="div"
                            class="control"
                            name="Agent Name"
                            rules="required|agent-name"
                            v-slot="{ errors }"
                        >
                            <input class="input" type="text" v-model="name" />
                            <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                        </validation-provider>
                    </div>
                    <div class="field">
                        <label for="" class="label">Max Active Tasks</label>
                        <validation-provider
                            tag="div"
                            class="control"
                            name="Max Active Tasks"
                            rules="agent-positiveNumber"
                            v-slot="{ errors }"
                        >
                            <input class="input" type="text" inputmode="numeric" v-model="selectedMaxActiveTasks" />
                            <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                        </validation-provider>
                    </div>
                    <div class="field">
                        <label for="" class="label">Handle General Tasks</label>
                        <div class="control">
                            <input type="checkbox" v-model="selectedHandleGeneralTasks" />
                        </div>
                    </div>
                    <div class="field">
                        <label for="" class="label">Inactive Agent Timeout (ms)</label>
                        <validation-provider
                            tag="div"
                            class="control"
                            name="Inactive Agent Timeout(ms)"
                            rules="agent-positiveNumber"
                            v-slot="{ errors }"
                        >
                            <input class="input" type="text" v-model="selectedInactiveAgentTimeout" />
                            <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                        </validation-provider>
                    </div>
                    <div class="field">
                        <label for="" class="label">Inactive Agent Job</label>
                        <div class="control">
                            <job-def-search :jobDefId="selectedInactiveAgentJobDefId" @jobDefPicked="onJobDefPicked" />
                        </div>
                    </div>
                    <div class="field">
                        <label for="" class="label">Inactive Job Vars</label>
                        <div class="control"></div>
                    </div>
                </validation-observer>
            </div>
            <div class="column">
                <h2 class="title">Tags</h2>
                <div class="field has-addons">
                    <div class="control">
                        <input class="input" type="text" placeholder="key=value" @keypress.enter="onAddTagClicked" />
                    </div>
                    <div class="control">
                        <button class="button is-info" @click="onAddTagClicked">Add tag</button>
                    </div>
                </div>
                <h3 class="title is-4" v-if="selectedAgentTags.length === 0">Agent has no tags</h3>
                <div v-else class="field is-grouped is-grouped-multiline">
                    <div class="control" v-for="tag in selectedAgentTags" :key="tag">
                        <div class="tags has-addons">
                            <span class="tag is-primary">{{ tag }}</span>
                            <a class="tag is-delete" @click="onDeleteTagClicked(tag)"></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <VariableList v-model="runtimeVars" class="mb-5" />
        <div class="buttons">
            <button class="button is-primary" :class="{ 'is-loading': isSaving }" @click="onAgentSave">Save</button>
            <button class="button" @click="onCancel">Cancel</button>
        </div>
    </div>
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from 'vee-validate';
import { Component, Vue } from 'vue-property-decorator';
import _ from 'lodash';

import SystemInformationModal from '@/components/agent/SystemInformationModal.vue';
import { AlertCategory, AlertPlacement, SgAlert } from '@/store/alert/types';
import { BindSelectedCopy, BindSelected, BindProp } from '@/decorator';
import { VariableMap } from '@/components/runtimeVariable/types';
import { VariableList } from '@/components/runtimeVariable';
import JobDefSearch from '@/components/JobDefSearch.vue';
import { showErrors } from '@/utils/ErrorHandler';
import { JobDef } from '@/store/jobDef/types';
import { Agent } from '@/store/agent/types';
import { StoreType } from '@/store/types';

@Component({
    components: { JobDefSearch, ValidationObserver, ValidationProvider, VariableList },
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
    public isSaving = false;

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

    public get runtimeVars() {
        return this.agent.propertyOverrides?.inactiveAgentJob?.runtimeVars;
    }

    public set runtimeVars(runtimeVars: VariableMap) {
        const inactiveAgentJob = this.agent.propertyOverrides.inactiveAgentJob ?? { id: '' };

        this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, {
            propertyOverrides: {
                ...this.agent.propertyOverrides,
                inactiveAgentJob: {
                    ...inactiveAgentJob,
                    runtimeVars,
                },
            },
        });
    }

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

            this.isSaving = true;

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
        } finally {
            this.isSaving = false;
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

    public onNavigateToAgents(): void {
        this.$router.push({ name: 'agentMonitor' });
    }

    public onShowSystemInformation(): void {
        this.$modal.show(SystemInformationModal, {
            agentName: this.agent.name,
            systemInformation: this.agent.sysInfo,
        });
    }
}
</script>

<style src="vue-slim-tabs/themes/default.css"></style>

<style lang="scss" scoped>
:deep(.vue-tablist) {
    padding: 0 64px;
}
</style>