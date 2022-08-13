<template>
    <select v-model="runtimeModel">
        <option v-for="runtime in runtimes" :key="runtime" :value="runtime">
            {{ runtime }}
        </option>
    </select>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
    import _ from 'lodash';

    import { LambdaRuntimes } from '@/store/stepDef/types';
    import { ScriptType } from '@/store/script/types';

    @Component
    export default class LambdaRuntimeSelect extends Vue {
        @Prop() scriptType: ScriptType;
        @Prop() value: LambdaRuntimes;

        private mounted (): void {
            if (!this.value) {
                this.runtimeModel = this.runtimes[0];
            }
        }

        @Watch('scriptType')
        private async onScriptTypeChange (): Promise<void> {
            this.runtimeModel = this.runtimes[0];
        }

        public get runtimeModel (): LambdaRuntimes {
            return this.value;
        }

        public set runtimeModel (value: LambdaRuntimes) {
            this.$emit('input', value);
        }

        public get runtimes (): LambdaRuntimes[] {
            switch (+this.scriptType) {
                case ScriptType.JAVASCRIPT:
                case ScriptType.NODE:
                    return [LambdaRuntimes.NODEJS_14, LambdaRuntimes.NODEJS_12];
                case ScriptType.RUBY:
                    return [LambdaRuntimes.RUBY_2_7];
                case ScriptType.PYTHON:
                    return [LambdaRuntimes.PYTHON_3_9, LambdaRuntimes.PYTHON_3_8, LambdaRuntimes.PYTHON_3_7];
                default:
                    return Object.values(LambdaRuntimes);
            }
        }
    }
</script>
