<template>
    <section class="columns content">
        <div class="column is-narrow">
            <div class="box">
                <p>Let's run a script right now on AWS Lambda with SaasGlue. First click what language you want the script to be in.</p>
                <div class="select is-fullwidth">
                    <select
                        @change="onScriptSelect"
                        v-model="newScriptType"
                    >
                        <option
                        v-for="(value, key) in scriptTypes"
                        :key="`scriptType${key}-${value}`"
                        :value="key">{{ value }}</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="column is-narrow">
            <div class="box">
                <p>Awesome! Now that you have the script created, let's run it. Click the "Run Script" button.</p>
                <button class="button is-primary">Run Script</button>
            </div>
        </div>
        <div class="column is-narrow">
            <div class="box">
                Awesome! The script is now running in AWS Lambda. Check out the script output in "Output" tab.
            </div>
        </div>
    </section>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';

    import { ScriptType, scriptTypesForMonaco } from '@/store/script/types';
    import { StoreType } from '@/store/types';

    @Component
    export default class LambdaScript extends Vue {
        public newScriptType: ScriptType = undefined;

        public static getTitle () {
            return 'Lambda Script Guide';
        }

        public get scriptTypes (): Record<string, string> {
            return {
                undefined: 'Please Select',
                ...scriptTypesForMonaco
            };
        }

        public async onScriptSelect (): Promise<void> {
            const newScript = {
                name: `Guide_${scriptTypesForMonaco[this.newScriptType]}_${Math.random().toFixed(8).substring(2, 6)}`,
                scriptType: this.newScriptType,
                // create pool of code templates
                code: btoa('console.log("Hello, World!");'),
                lastEditedDate: new Date().toISOString()
            };

            const script = await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {script: newScript});

            this.$store.dispatch(`${StoreType.ScriptStore}/select`, script);

            // Move lambda settings to the vuex
            // this.$store.dispatch(`${StoreType.ICSettings}/select, icSettings);
        }
    }
</script>

<style lang="scss" scoped>
    .box {
        width: 300px;
        height: 192px;
        overflow: auto;
    }
</style>
