<template>
    <div class="field">
        <VariableForm @create="onVariableCreate"
            :variable="variable"
            class="ml-2" />
        <h3 v-if="!hasVariables" class="is-size-4 py-3 align-middle has-text-centered">
            No runtime vars yet
        </h3>
        <table v-else class="table">
            <thead>
                <tr>
                    <th></th>
                    <th>Key</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(runtimeVariable, key) in changedVariables" :key="key">
                    <td class="align-middle">
                        <div class="control">
                            <label class="checkbox">
                                <input @change="runtimeVariable.sensitive = $event.target.checked"
                                    :checked="runtimeVariable.sensitive"
                                    type="checkbox" /> Sensitive
                            </label>
                            <v-popover class="is-inline ml-2">
                                <a href="#">
                                    <font-awesome-icon icon="question-circle" />
                                </a>
                                <span slot="popover" class="is-inline-block" style="max-width:300px;">
                                    Runtime variables marked as sensitive are hidden by default in the console and redacted in job logs.
                                </span>
                            </v-popover>
                        </div>
                    </td>
                    <td>
                        <input :value="key"
                            readonly
                            class="input"
                            type="text"
                            style="width: 250px;"
                            placeholder="Key"
                        />
                    </td>
                    <td>
                        <ValueInput
                            :value="runtimeVariable"
                            @change="onValueInputChange(key, $event)"
                            class="mb-0"
                            style="width: 250px;"
                            placeholder="Value" />
                    </td>
                    <td class="align-middle">
                        <div class="field is-grouped">
                            <p class="control">
                                <a href="#" @click.prevent="onRemove(key)">
                                    <font-awesome-icon icon="minus-square" />
                                </a>
                            </p>
                            <p v-if="hasChanges(key)" class="control">
                                <a href="#" title="Apply Changes" @click.prevent="onApplyChanges(key)">
                                    <font-awesome-icon icon="save" />
                                </a>
                            </p>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
    import { cloneDeep, isEqual, cloneDeepWith, isEmpty } from 'lodash';
    import { VPopover } from 'v-tooltip';

    import { KeylessVariable, ValueFormat, Variable, VariableMap } from './types';
    import VariableForm from './VariableForm.vue';
    import ValueInput from './ValueInput.vue';

    @Component({
        components: { VariableForm, ValueInput, VPopover }
    })
    export default class VariablesList extends Vue {
        @Prop({ default: () => ({}) }) public readonly value: VariableMap;
        @Prop() public readonly variable: Variable;

        private changedVariables: VariableMap = {};
        public variables: VariableMap = {};

        private created (): void {
            const customizer = (value, key) => {
                if (key === 'format') {
                    return value ?? ValueFormat.TEXT;
                }
            };


            this.changedVariables = cloneDeepWith(this.value, customizer);
            this.variables = cloneDeepWith(this.value, customizer);
        }

        public get hasVariables (): boolean {
            return !isEmpty(this.changedVariables);
        }

        public hasChanges (key: string): boolean {
            return !isEqual(this.variables[key], this.changedVariables[key]);
        }

        @Watch('value')
        private readVariables (): void {
            const customizer = (value, key) => {
                if (key === 'format') {
                    return value ?? ValueFormat.TEXT;
                }
            };

            this.variables = cloneDeepWith(this.value, customizer);

            for (let key in this.value) {
                if (!this.changedVariables[key]) {
                    Vue.set(this.changedVariables, key, {
                        format: this.value[key].format ?? ValueFormat.TEXT,
                        sensitive: this.value[key].sensitive,
                        value: this.value[key].value,
                    });
                }
            }
        }

        public onVariableCreate (variable: Variable): void {
            this.variables = Object.assign({}, {
                [variable.key]: {
                    sensitive: variable.sensitive,
                    format: variable.format,
                    value: variable.value,
                }
            }, this.variables);

            this.changedVariables = Object.assign({}, {
                [variable.key]: {
                    sensitive: variable.sensitive,
                    format: variable.format,
                    value: variable.value,
                }
            }, this.changedVariables);

            this.$emit('create', variable);
            this.emitInput();
        }

        public onRemove (key: string): void {
            const removed = this.variables[key];

            Vue.delete(this.changedVariables, key);
            Vue.delete(this.variables, key);

            this.$emit('remove', { ...removed, key });
            this.emitInput();
        }

        private onValueInputChange (key: string, variable: KeylessVariable): void {
            Vue.set(this.changedVariables, key, {
                sensitive: this.changedVariables[key].sensitive,
                format: variable.format,
                value: variable.value,
            });
        }

        private onApplyChanges (key: string): void {
            const variable = this.changedVariables[key];

            Vue.set(this.variables, key, variable);

            this.emitUpdate({ ...variable, key });
            this.emitInput();
        }

        public emitInput (): void {
            this.$emit('input', cloneDeep(this.variables));
        }

        public emitUpdate (variable: Variable): void {
            this.$emit('update:variable', variable);
        }
    }
</script>

<style scoped lang="scss">
    .code-icon {
        pointer-events: all;
    }

    .table {
        background-color: inherit;

        td.align-middle {
            vertical-align: middle;
        }
    }
</style>
