<template>
    <div class="field">
        <VariableForm class="ml-2" @create="onVariableCreate" />
        <table v-if="variables.length" class="table">
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
                                <input type="checkbox" v-model="runVar.sensitive"> Sensitive
                            </label>
                            <v-popover class="is-inline ml-2">
                                <a href="#">
                                    <font-awesome-icon icon="question-circle" />
                                </a>
                                <span slot="popover">
                                Description text
                                </span>
                            </v-popover>
                        </div>
                    </td>
                    <td>
                        <input v-model="runVar.key"
                            class="input"
                            type="text"
                            style="width: 250px;"
                            placeholder="Key"
                        />
                    </td>
                    <td>
                        <ValueInput v-model="runVar.value"
                            :sensitive="runVar.sensitive"
                            class="mb-0"
                            style="width: 250px;"
                            placeholder="Value" />
                    </td>
                    <td class="align-middle">
                        <a href="#" @click.prevent="onRemove(index)">
                            <font-awesome-icon icon="minus-square" />
                        </a>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';
    import { VPopover } from 'v-tooltip';

    import VariableForm from './VariableForm.vue';
    import ValueInput from './ValueInput.vue';
    import { Variable } from './types';

    @Component({
        components: { VariableForm, ValueInput, VPopover }
    })
    export default class VariablesList extends Vue {
        public variables: Variable[] = [];

        public onVariableCreate (variable: Variable): void {
            this.variables.push(variable);
        }

        public onRemove (index: number): void {
            this.variables.splice(index, 1);
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
