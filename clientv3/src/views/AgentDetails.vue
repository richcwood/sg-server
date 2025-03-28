<template>
    <div class="sg-container-p">
        <header class="mb-5 is-flex is-align-items-center">
            <a href="#" @click.prevent="onNavigateToAgents" class="mr-5 is-size-5">
                <font-awesome-icon icon="chevron-left" class="mr-2" />
                <span>Back To Agents</span>
            </a>
            <ul class="tab-menu is-flex is-align-items-center has-text-weight-bold is-size-5 ml-6">
                <li>
                    <a
                        @click.prevent="onTabSelect(AgentDetailsTab.SETTINGS)"
                        :class="{ 'is-active': activeTab === AgentDetailsTab.SETTINGS }"
                        class="px-1"
                        href="#"
                        >Settings</a
                    >
                </li>
                <li>
                    <a
                        @click.prevent="onTabSelect(AgentDetailsTab.TAGS)"
                        :class="{ 'is-active': activeTab === AgentDetailsTab.TAGS }"
                        class="px-1"
                        href="#"
                        >Tags</a
                    >
                </li>
                <li>
                    <a
                        @click.prevent="onTabSelect(AgentDetailsTab.INACTIVE_JOB_VARS)"
                        :class="{ 'is-active': activeTab === AgentDetailsTab.INACTIVE_JOB_VARS }"
                        class="px-1"
                        href="#"
                        >Inactive Agent Job</a
                    >
                </li>
                <li>
                    <a
                        @click.prevent="onTabSelect(AgentDetailsTab.SYSTEM_INFO)"
                        :class="{ 'is-active': activeTab === AgentDetailsTab.SYSTEM_INFO }"
                        class="px-1"
                        href="#"
                        >System Information</a
                    >
                </li>
            </ul>
        </header>
        <validation-observer
            v-if="activeTab === AgentDetailsTab.SETTINGS"
            ref="agentSettingsValidationObserver"
            tag="div"
        >
            <div class="columns">
                <div class="column is-6">
                    <div class="field is-horizontal">
                        <div class="field-label">
                            <label for="" class="label">Agent Name</label>
                        </div>
                        <div class="field-body">
                            <div class="field">
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
                        </div>
                    </div>
                    <div class="field is-horizontal">
                        <div class="field-label">
                            <label for="" class="label">Max Active Tasks</label>
                        </div>
                        <div class="field-body">
                            <div class="field">
                                <validation-provider
                                    tag="div"
                                    class="control"
                                    name="Max Active Tasks"
                                    rules="agent-positiveNumber"
                                    v-slot="{ errors }"
                                >
                                    <input
                                        class="input"
                                        type="text"
                                        inputmode="numeric"
                                        v-model="selectedMaxActiveTasks"
                                    />
                                    <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                                </validation-provider>
                            </div>
                        </div>
                    </div>
                    <div class="field is-horizontal">
                        <div class="field-label">
                            <label for="" class="label">Handle General Tasks</label>
                        </div>
                        <div class="field-body">
                            <div class="field">
                                <div class="control">
                                    <input type="checkbox" v-model="selectedHandleGeneralTasks" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="buttons">
                <button class="button is-primary" :class="{ 'is-loading': isSaving }" @click="onAgentSave">Save</button>
                <button class="button" @click="onCancel">Cancel</button>
            </div>
        </validation-observer>
        <div v-else-if="activeTab === AgentDetailsTab.TAGS">
            <validation-provider name="Agent Tags" rules="variable-map" v-slot="{ errors, invalid }">
                <div class="field has-addons">
                    <div class="control">
                        <input
                            class="input"
                            v-model="newTag"
                            type="text"
                            placeholder="key=value"
                            @keypress.enter="onAddTagClicked"
                        />
                    </div>
                    <div class="control">
                        <button class="button is-primary" :disabled="invalid" @click="onAddTagClicked">Add tag</button>
                    </div>
                </div>
                <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
            </validation-provider>
            <h3 class="title is-4" v-if="selectedAgentTags.length === 0">Agent has no tags</h3>
            <div v-else class="field is-grouped is-grouped-multiline mt-5">
                <div class="control" v-for="tag in selectedAgentTags" :key="tag">
                    <div class="tags has-addons">
                        <span class="tag is-primary is-light">{{ tag }}</span>
                        <a class="tag is-delete" @click="onDeleteTagClicked(tag)"></a>
                    </div>
                </div>
            </div>
        </div>
        <div v-else-if="activeTab === AgentDetailsTab.INACTIVE_JOB_VARS">
            <div class="field is-horizontal">
                <div class="field-label">
                    <label for="" class="label">Inactive Agent Job</label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <div class="control">
                            <JobDefSearch
                                class="jod-def-search"
                                :jobDefId="selectedInactiveAgentJobDefId"
                                @jobDefPicked="onJobDefPicked"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div class="field is-horizontal">
                <div class="field-label">
                    <label for="" class="label">Inactive Agent Timeout (ms)</label>
                </div>
                <div class="field-body">
                    <div class="field">
                        <validation-provider
                            tag="div"
                            class="control"
                            name="Inactive Agent Timeout(ms)"
                            rules="agent-positiveNumber"
                            v-slot="{ errors }"
                        >
                            <input class="input field-250" type="text" v-model="selectedInactiveAgentTimeout" />
                            <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                        </validation-provider>
                    </div>
                </div>
            </div>
            <div class="is-divider"></div>
            <VariableList @input="onVariablesChange" :value="runtimeVars" />
        </div>
        <div v-else-if="activeTab === AgentDetailsTab.SYSTEM_INFO">
            <pre>{{ agent.sysInfo }}</pre>
        </div>
    </div>
</template>

<script lang="ts">
import { ValidationObserver, ValidationProvider } from 'vee-validate';
import { Component, Vue } from 'vue-property-decorator';
import { mapValues } from 'lodash';

import { VariableMap, ValueFormat } from '@/components/runtimeVariable/types';
import { AlertCategory, AlertPlacement, SgAlert } from '@/store/alert/types';
import { BindSelectedCopy, BindSelected, BindProp } from '@/decorator';
import { VariableList } from '@/components/runtimeVariable';
import JobDefSearch from '@/components/JobDefSearch.vue';
import { showErrors } from '@/utils/ErrorHandler';
import { tagsStringToMap } from '@/utils/Shared';
import { JobDef } from '@/store/jobDef/types';
import { Agent } from '@/store/agent/types';
import { StoreType } from '@/store/types';

enum AgentDetailsTab {
    SETTINGS = 1,
    TAGS,
    INACTIVE_JOB_VARS,
    SYSTEM_INFO,
}

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

    public readonly AgentDetailsTab = AgentDetailsTab;
    public activeTab: AgentDetailsTab = AgentDetailsTab.SETTINGS;

    private newTag = '';
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

    public get runtimeVars(): VariableMap {
        const variables = this.agent.propertyOverrides?.inactiveAgentJob?.runtimeVars;

        return variables
            ? mapValues(variables, (value) => ({ value, format: ValueFormat.TEXT, sensitive: false }))
            : null;
    }

    public async onVariablesChange(runtimeVars: VariableMap) {
        const inactiveAgentJob = this.agent.propertyOverrides.inactiveAgentJob
            ? Object.assign({}, this.agent.propertyOverrides.inactiveAgentJob, {
                  runtimeVars: mapValues(runtimeVars, 'value'),
              })
            : { id: '', runtimeVars };

        try {
            await this.$store.dispatch(`${StoreType.AgentStore}/saveSettings`, {
                id: this.agent.id,
                properties: {
                    inactiveAgentJob,
                },
            });

            this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, {
                propertyOverrides: Object.assign({}, this.agent.propertyOverrides, { inactiveAgentJob }),
            });

            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert('Saved inactive job variables.', AlertPlacement.FOOTER, AlertCategory.INFO)
            );
        } catch (e) {
            console.error(e);
            showErrors('Failed to update inactive job variables.', e);
        }
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
        } catch (e) {
            console.error(e);
            showErrors('Error saving agent settings.', e);
        } finally {
            this.isSaving = false;
        }
    }

    private onCancel(): void {
        this.$router.push({ name: 'agentMonitor' });
        this.$store.dispatch(`${StoreType.AgentStore}/select`, null);
    }

    private async onAddTagClicked() {
        if (!this.newTag.trim().length) {
            return;
        }

        const tags = Object.assign({}, this.agent.tags, tagsStringToMap(this.newTag.trim()));

        try {
            await this.$store.dispatch(`${StoreType.AgentStore}/saveTags`, {
                id: this.agent.id,
                tags,
            });

            this.newTag = '';

            this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, { tags });
            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert('Saved agent tags.', AlertPlacement.FOOTER, AlertCategory.INFO)
            );
        } catch (e) {
            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert(`Failed to save agent tags.`, AlertPlacement.FOOTER, AlertCategory.ERROR)
            );
            console.error(e);
        }
    }

    private async onDeleteTagClicked(tag: string) {
        // the tag should be in key=value format because it will come from the template above
        const [tagName] = tag.split('=');
        const tags = { ...this.agent.tags };

        delete tags[tagName];

        try {
            await this.$store.dispatch(`${StoreType.AgentStore}/saveTags`, {
                id: this.agent.id,
                tags,
            });

            this.$store.dispatch(`${StoreType.AgentStore}/updateSelectedCopy`, { tags });

            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert(`Agent ${tag} tag removed.`, AlertPlacement.FOOTER, AlertCategory.INFO)
            );
        } catch (e) {
            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert(`Failed to remove agent ${tag} tag.`, AlertPlacement.FOOTER, AlertCategory.ERROR)
            );
            console.error(e);
        }
    }

    public onNavigateToAgents(): void {
        this.$router.push({ name: 'agentMonitor' });
    }

    public onTabSelect(tab: AgentDetailsTab) {
        this.activeTab = tab;
    }
}
</script>

<style lang="scss" scoped>
.tab-menu a {
    font-variant-caps: all-small-caps;
    letter-spacing: 2px;
    margin-right: 1rem;
}

.tab-menu .is-active {
    background: deepskyblue;
    color: white;
}

.jod-def-search {
    margin-left: -10px;
}

.field-250 {
    width: 250px;
}
</style>
