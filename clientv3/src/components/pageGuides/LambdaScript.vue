<template>
    <section class="columns content">
        <div class="column is-narrow">
            <div class="box">
                <p>Let's run a script right now on AWS Lambda with SaasGlue. First click what language you want the script to be in.</p>
                <div class="select is-fullwidth" :class="{'is-loading': creatingScript}">
                    <select
                        @change="onScriptSelect"
                        v-model="selectedScriptType"
                    >
                        <option
                        v-for="(value, key) in scriptTypes"
                        :key="`scriptType${key}-${value}`"
                        :value="key">{{ value }}</option>
                    </select>
                </div>
                <div class="step">
                    <span class="step-number">1</span>
                    <div class="triangle"></div>
                </div>

                <div v-if="currentStep > 1" class="is-overlay is-step-ready">
                    <div class="is-overlay"></div>
                    <SuccessTick class="is-relative" />
                </div>
            </div>
        </div>

        <transition name="fade-left">
            <div v-if="currentStep > 1" class="column is-narrow">
                <div class="box">
                    <p>Awesome! Now that you have the script created, let's run it. Click the "Run Script" button.</p>
                    <button @click="onScriptRun" class="button is-primary">Run Script</button>
                    <div class="step">
                        <span class="step-number">2</span>
                        <div class="triangle"></div>
                    </div>

                    <div v-if="currentStep > 2" class="is-overlay is-step-ready">
                        <div class="is-overlay"></div>
                        <SuccessTick class="is-relative" />
                    </div>
                </div>
            </div>
        </transition>

        <transition name="fade-left">
            <div v-if="currentStep > 2" class="column is-narrow">
                <div class="box">
                    <p>Awesome! The script is now running in AWS Lambda. Check out the script output in "Script Results" tab.</p>
                    <div class="step">
                        <span class="step-number">3</span>
                        <div class="triangle"></div>
                    </div>
                </div>
            </div>
        </transition>
    </section>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';
    import moment from 'moment';
    import axios from 'axios';

    import { ScriptType, scriptTypesForMonaco } from '@/store/script/types';
    import SuccessTick from '@/components/pageGuides/SuccessTick.vue';
    import { ICTab } from '@/store/interactiveConsole/types';
    import { TaskDefTarget } from '@/store/taskDef/types';
    import { StoreType } from '@/store/types';

    @Component({
        components: { SuccessTick }
    })
    export default class LambdaScript extends Vue {
        public selectedScriptType: ScriptType = null;
        public creatingScript = false;
        public currentStep = 1;

        private codeTemplate: Record<ScriptType, string> = {
            [ScriptType.PYTHON]: 'print("Hello World")',
            [ScriptType.NODE]: 'console.log("Hello World")',
            [ScriptType.SH]: 'echo "Hello World"',
            [ScriptType.CMD]: 'echo "Hello World"',
            [ScriptType.RUBY]: 'puts "Hello World"',
            [ScriptType.LUA]: 'print("Hello World")',
            [ScriptType.PERL]: "say 'Hello World'", 
            [ScriptType.PHP]: '<?php echo("Hello World") ?>',
            [ScriptType.POWERSHELL]: "Write-Host 'Hello World'",
            [ScriptType.JAVASCRIPT]: 'console.log("Hello World")',
        };

        public static getTitle () {
            return 'Lambda Script Guide';
        }

        public get scriptTypes (): Record<string, string> {
            return {
                null: 'Please Select',
                ...scriptTypesForMonaco
            };
        }

        public async onScriptSelect (): Promise<void> {
            this.creatingScript = true;
            this.currentStep = 2;

            try {
                const script = await this.$store.dispatch(`${StoreType.ScriptStore}/save`, {
                    script: {
                        name: `Guide_${scriptTypesForMonaco[this.selectedScriptType]}_${Math.random().toFixed(8).substring(2, 6)}`,
                        scriptType: this.selectedScriptType,
                        code: btoa(this.codeTemplate[this.selectedScriptType]),
                        lastEditedDate: new Date().toISOString()
                    }
                });

                this.$store.dispatch(`${StoreType.ScriptStore}/select`, script);
                this.$store.dispatch(`${StoreType.InteractiveConsole}/updateSelectedCopy`, {
                    runAgentTarget: TaskDefTarget.SINGLE_AGENT,
                    runAgentTargetAgentId: null,
                    runAgentTargetTags_string: '',
                    runScriptCommand: '',
                    runScriptArguments: '',
                    runScriptEnvVars: '',
                    runScriptRuntimeVars: '',
                    lambdaDependencies: '',
                    lambdaRuntime: '',
                    lambdaMemory: 128,
                    lambdaTimeout: 3,
                    activeTab: ICTab.LAMBDA
                });
            } catch (e) {
                console.error(e);
            } finally {
                this.creatingScript = false;
            }
        }

        public async onScriptRun (): Promise<void> {
            this.currentStep = 3;
            // const scriptShadowCopy = this.$store[StoreType.ScriptShadowStore].selectedCopy;

            // if (!scriptShadowCopy) {
            //     console.error("Script shadow was not loaded so it could not be run.");
            //     return;
            // }

            // const currentTeamId = this.$store.state[StoreType.TeamStore].selected.id;

            // try {
                // const newStep: any = {
                //     name: 'Console Step',
                //     script: {
                //         scriptType: this.selectedScriptType,
                //         code: scriptShadowCopy.shadowCopyCode, // use script type template
                //     },
                //     order: 0,
                //     command: this.runScriptCommand,
                //     arguments: this.runScriptArguments,
                //     variables: this.envVarsAsMap,
                // };

            //     const runAgentTarget = TaskDefTarget.AWS_LAMBDA;
            //     newStep.lambdaRuntime = this.lambdaConfig.lambdaRuntime;
            //     newStep.lambdaMemorySize = this.lambdaConfig.lambdaMemorySize;
            //     newStep.lambdaTimeout = this.lambdaConfig.lambdaTimeout;
            //     newStep.lambdaDependencies = this.lambdaConfig.lambdaDependencies;

            // const newJob = {
            //     job: {
            //     name: `IC-${moment().format("dddd MMM DD h:mm a")}`,
            //     dateCreated: new Date().toISOString(),
            //     runtimeVars: this.runtimeVarsAsMap,
            //     tasks: [
            //         {
            //         _teamId: currentTeamId,
            //         name: `Task1`,
            //         source: 0,
            //         requiredTags: tagsStringToMap(this.runAgentTargetTags_string),
            //         target: runAgentTarget,
            //         targetAgentId: this.runAgentTargetAgentId,
            //         fromRoutes: [],
            //         steps: [newStep],
            //         correlationId: Math.random()
            //             .toString()
            //             .substring(3, 12),
            //         },
            //     ],
            //     },
            // };

            // const {
            //     data: { data },
            // } = await axios.post("/api/v0/job/ic/", newJob);
            // // make sure to use the same object in the store or it won't be reactive to browser push events
            // this.runningJobs.push(await this.$store.dispatch(`${StoreType.JobStore}/fetchModel`, data.id));

            // this.expandScriptEditor = false;
            // } catch (err) {
            // console.error(err);
            // showErrors("Error running the script", err);
            // } finally {
            // this.$modal.hide("run-script-options");
            // }
        }
    }
</script>

<style lang="scss" scoped>
    .box {
        position: relative;
        z-index: 2;
        width: 300px;
        height: 192px;
        overflow: auto;
    }

    .step {
        position: absolute;
        left: 0;
        top: 0;
    }

    .step-number {
        position: relative;
        z-index: 1;
        padding-left: 7px;
        font-weight: bold;
        color: white;
    }

    .triangle {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        border-top: 40px solid deepskyblue;
        border-right: 40px solid transparent;
    }

    .is-step-ready {
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2;
    }

    .is-step-ready .is-overlay {
        background: white;
        opacity: .8;
    }

    .fade-left-leave-active,
    .fade-left-enter-active {
        transition: .5s;
    }
    .fade-left-enter {
        transform: translate(-100%, 0);
        opacity: 0;
    }
    .fade-left-leave-to {
        transform: translate(0, 0);
        opacity: 1;
    }
</style>
