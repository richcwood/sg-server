<template>
    <modal-card>
        <template #title>Manage Agents Tags</template>
        <template #body>
            <div>
                <p class="notification is-warning is-light">
                    Any changes to tags in this modal dialog will affect all
                    <strong>{{ agents.length }}</strong> filtered agents.
                </p>
                <validation-provider name="Agent Tags" rules="variable-map" v-slot="{ errors, invalid }">
                    <div class="field has-addons">
                        <div class="control">
                            <input
                                class="input"
                                v-model="newTag"
                                type="text"
                                placeholder="key=value(, ...)"
                                @keypress.enter="onTagsAdd"
                            />
                        </div>
                        <div class="control">
                            <button class="button is-primary" :disabled="invalid" @click="onTagsAdd">Add tag</button>
                        </div>
                    </div>
                    <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                </validation-provider>
                <p v-if="intersectionTags.length === 0" class="notification is-info is-light my-5">
                    Filtered <strong>{{ agents.length }}</strong> agents do not share common tags.
                </p>
                <template v-else>
                    <div class="notification is-info is-light my-5">
                        <p>
                            All <strong>{{ agents.length }}</strong> agents share the same tags listed below.
                        </p>
                    </div>
                    <div class="field is-grouped is-grouped-multiline mt-5">
                        <div class="control" v-for="tag in intersectionTags" :key="tag">
                            <div class="tags has-addons">
                                <span class="tag is-primary is-light">{{ tag }}</span>
                                <a class="tag is-delete" @click="onTagsRemove(tag)"></a>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </template>
        <template #footer>
            <button class="button ml-auto" @click="$emit('close')">Cancel</button>
        </template>
    </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
import { ValidationProvider } from 'vee-validate';

import { AlertCategory, AlertPlacement, SgAlert } from '@/store/alert/types';
import ModalCard from '@/components/core/ModalCard.vue';
import { tagsStringToMap } from '@/utils/Shared';
import { Agent } from '@/store/agent/types';
import { StoreType } from '@/store/types';

@Component({
    name: 'AgentsTagsModal',
    components: { ModalCard, ValidationProvider },
})
export default class AgentsTagsModal extends Vue {
    @Prop({ required: true })
    public readonly agents: Agent[];

    public newTag: string = '';

    private get intersectionTags(): string[] {
        const tagsAgents: Record<string, string[]> = {};
        const intersections = [];

        this.agents.forEach((agent) => {
            for (let key in agent.tags) {
                const tag = `${key}=${agent.tags[key]}`;

                if (!tagsAgents[tag]) {
                    tagsAgents[tag] = [];
                }

                tagsAgents[tag].push(agent.id);
            }
        });

        for (let key in tagsAgents) {
            if (tagsAgents[key].length === this.agents.length) {
                intersections.push(key);
            }
        }

        return intersections;
    }

    public async onTagsAdd(): Promise<void> {
        if (!this.newTag.trim().length) {
            return;
        }

        const tags = tagsStringToMap(this.newTag.trim());

        try {
            const savePromises = this.agents.map((agent) =>
                this.$store.dispatch(`${StoreType.AgentStore}/saveTags`, {
                    id: agent.id,
                    tags: Object.assign({}, agent.tags, tags),
                })
            );

            await Promise.all(savePromises);

            this.newTag = '';

            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert(
                    `Successfully added tag(s) to ${this.agents.length} agent(s).`,
                    AlertPlacement.FOOTER,
                    AlertCategory.INFO
                )
            );
        } catch (err) {
            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert(
                    `Failed to add tag(s) to ${this.agents.length} agent(s).`,
                    AlertPlacement.FOOTER,
                    AlertCategory.ERROR
                )
            );
            console.error(err);
        }
    }

    public async onTagsRemove(tag: string): Promise<void> {
        const [tagName] = tag.split('=');

        try {
            const savePromises = this.agents.map((agent) => {
                const tags = { ...agent.tags };

                delete tags[tagName];

                return this.$store.dispatch(`${StoreType.AgentStore}/saveTags`, {
                    id: agent.id,
                    tags,
                });
            });

            await Promise.all(savePromises);

            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert(
                    `Removed ${tag} tag from ${this.agents.length} agent(s).`,
                    AlertPlacement.FOOTER,
                    AlertCategory.INFO
                )
            );
        } catch (e) {
            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert(
                    `Failed to remove ${tag} tag from ${this.agents.length} agent(s).`,
                    AlertPlacement.FOOTER,
                    AlertCategory.INFO
                )
            );
        }
    }
}
</script>

<style lang="scss" scoped>
.ml-auto {
    margin-left: auto;
}
</style>