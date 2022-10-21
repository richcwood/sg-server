<template>
    <div class="field">
        <VariableForm @create="onVariableCreate"
            :variable="variable"
            class="ml-2" />
        <h3 v-if="!variables.length" class="is-size-4 py-3 align-middle has-text-centered">
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
                <tr v-for="(runVar, index) in variables" :key="runVar.key">
                    <td class="align-middle">
                        <div class="control">
                            <label class="checkbox">
                                <input type="checkbox" @change="onChange" v-model="runVar.sensitive"> Sensitive
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
                        <input v-model="runVar.key"
                            readonly
                            class="input"
                            type="text"
                            style="width: 250px;"
                            placeholder="Key"
                        />
                    </td>
                    <td>
                        <ValueInput
                            :value="runVar"
                            @change="onValueInputChange(index, $event)"
                            class="mb-0"
                            style="width: 250px;"
                            placeholder="Value" />
                    </td>
                    <td class="align-middle">
                        <div class="field is-grouped">
                            <p class="control">
                                <a href="#" @click.prevent="onRemove(index)">
                                    <font-awesome-icon icon="minus-square" />
                                </a>
                            </p>
                            <p v-if="updateOnClick" class="control">
                                <a href="#" title="Save Changes" @click.prevent="onTriggerUpdate">
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
    import { VPopover } from 'v-tooltip';

    import { KeylessVariable, ValueFormat, Variable, VariableMap } from './types';
    import VariableForm from './VariableForm.vue';
    import ValueInput from './ValueInput.vue';

    @Component({
        components: { VariableForm, ValueInput, VPopover }
    })
    export default class VariablesList extends Vue {
        @Prop({ default: () => ({}) }) public readonly value: VariableMap;
        @Prop({ default: false }) public readonly updateOnClick: boolean;
        @Prop() public readonly variable: Variable;

        private updatedVars: string[] = [];
        public variables: Variable[] = [];

        private created (): void {
            this.readVariables();
        }

        @Watch('value')
        private readVariables (): void {
            this.variables = [];

            for (let key in this.value) {
                this.variables.unshift({
                    sensitive: this.value[key].sensitive,
                    format: this.value[key].format ?? ValueFormat.TEXT,
                    value: this.value[key].value,
                    key
                });
            }
        }

        public onVariableCreate (variable: Variable): void {
            this.variables.push(variable);
            this.$emit('create', variable);
            this.onChange();
        }

        public onRemove (index: number): void {
            const removed = this.variables.splice(index, 1);
            this.$emit('remove', removed.pop());
            this.onChange();
        }

        private onValueInputChange (index: number, payload: KeylessVariable): void {
            this.variables = this.variables.map((variable, i) => {
                if (index === i) {
                    return Object.assign({}, variable, payload);
                }

                return variable;
            });

            this.onChange();
        }

        public onChange (): void {
            this.$emit('input', this.toMap());
        }

        private toMap (): VariableMap {
            return this.variables.reduce((map: VariableMap, variable: Variable) => {
                map[variable.key] = {
                    sensitive: variable.sensitive,
                    format: variable.format,
                    value: variable.value
                };

                return map;
            }, {});
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
