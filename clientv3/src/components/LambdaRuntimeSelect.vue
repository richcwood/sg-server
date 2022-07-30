<template>
    <select @change="onChange" :selected="value">
        <option v-for="runtime in runtimes" :key="runtime" :value="runtime">
            {{ runtime }}
        </option>
    </select>
</template>

<script lang="ts">
    import { Component, Vue, Prop } from 'vue-property-decorator';
    import _ from 'lodash';

    import { LambdaRuntimes } from '@/store/stepDef/types';
    import { ScriptType } from '@/store/script/types';

    @Component
    export default class LambdaRuntimeSelect extends Vue {
        @Prop() scriptType: ScriptType;
        @Prop() value: LambdaRuntimes;

        public get runtimes (): LambdaRuntimes[] {
            switch (this.scriptType) {
                case ScriptType.JAVASCRIPT:
                case ScriptType.NODE:
                    return [LambdaRuntimes.NODEJS_14, LambdaRuntimes.NODEJS_12];
                case ScriptType.RUBY:
                    return [LambdaRuntimes.RUBY_2_7];
                case ScriptType.PYTHON:
                    return [LambdaRuntimes.PYTHON_3_9, LambdaRuntimes.PYTHON_3_8, LambdaRuntimes.PYTHON_3_7, LambdaRuntimes.PYTHON_3_6];
                default:
                    return Object.values(LambdaRuntimes);
            }
        }

        public onChange (e: HTMLInputElement & { target: HTMLInputElement }): void {
            this.$emit('input', e.target.value);
        }
    }
</script>
