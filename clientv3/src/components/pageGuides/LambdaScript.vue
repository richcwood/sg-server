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
                    <button @click="onScriptRun"
                        :disabled="isScriptRunning"
                        :class="{'is-loading': isScriptRunning}"
                        class="button is-primary">Run Script</button>
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

    import { InteractiveConsole, ScriptTarget } from '@/store/interactiveConsole/types';
    import { ScriptType, scriptTypesForMonaco } from '@/store/script/types';
    import { getLambdaRuntimesForScriptType } from '@/store/stepDef/types';
    import SuccessTick from '@/components/pageGuides/SuccessTick.vue';
    import { ScriptShadow } from '@/store/scriptShadow/types';
    import { BindSelectedCopy } from '@/decorator/bindable';
    import { TaskDefTarget } from '@/store/taskDef/types';
    import { ICJobSettings } from '@/store/job/types';
    import { showErrors } from '@/utils/ErrorHandler';
    import { StoreType } from '@/store/types';

    @Component({
        components: { SuccessTick }
    })
    export default class LambdaScript extends Vue {
        public selectedScriptType: ScriptType = null;
        public isScriptRunning = false;
        public creatingScript = false;
        public currentStep = 1;

        private codeTemplate: Record<ScriptType, string> = {
            [ScriptType.PYTHON]: 'print("Hello World")',
            [ScriptType.NODE]: 'console.log("Hello World")',
            [ScriptType.SH]: 'echo "Hello World"',
            [ScriptType.RUBY]: 'puts "Hello World"',
            [ScriptType.JAVASCRIPT]: 'console.log("Hello World")',
        };

        @BindSelectedCopy({ storeType: StoreType.InteractiveConsole })
        public readonly interactiveConsole: InteractiveConsole;

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
                    lambdaRuntime: getLambdaRuntimesForScriptType(this.selectedScriptType).shift(),
                    lambdaDependencies: '',
                    lambdaMemory: 128,
                    lambdaTimeout: 3,
                    scriptTarget: ScriptTarget.LAMBDA
                });
            } catch (e) {
                console.error(e);
            } finally {
                this.currentStep = 2;
                this.creatingScript = false;
            }
        }

        public async onScriptRun (): Promise<void> {
            try {
                this.isScriptRunning = true;

                const scriptShadowCopy: ScriptShadow = this.$store.state[StoreType.ScriptShadowStore].selectedCopy;
                const icJobSettings: ICJobSettings = {
                    scriptType: ScriptType[this.selectedScriptType] as any as ScriptType,
                    code: scriptShadowCopy.shadowCopyCode,
                    runScriptCommand: this.interactiveConsole.runScriptCommand,
                    runScriptArguments: this.interactiveConsole.runScriptArguments,
                    runScriptEnvVars: this.interactiveConsole.runScriptEnvVars,
                    runAgentTarget: this.interactiveConsole.runAgentTarget,
                    runScriptRuntimeVars: this.interactiveConsole.runScriptRuntimeVars,
                    runAgentTargetTags_string: this.interactiveConsole.runAgentTargetTags_string,
                    runAgentTargetAgentId: this.interactiveConsole.runAgentTargetAgentId,
                };

                if (this.interactiveConsole.scriptTarget === ScriptTarget.LAMBDA) {
                    Object.assign(icJobSettings, {
                        runAgentTarget: TaskDefTarget.AWS_LAMBDA,
                        lambdaDependencies: this.interactiveConsole.lambdaDependencies,
                        lambdaMemory: this.interactiveConsole.lambdaMemory,
                        lambdaRuntime: this.interactiveConsole.lambdaRuntime,
                        lambdaTimeout: this.interactiveConsole.lambdaTimeout,
                    });
                }

                const data = await this.$store.dispatch(`${StoreType.JobStore}/runICJob`, icJobSettings);
                this.$store.dispatch(`${StoreType.InteractiveConsole}/updateSelectedCopy`, {
                    latestRanJobId: data.id
                });
            } catch (err) {
                console.error(err);
                showErrors('Error running the script', err);
            } finally {
                this.currentStep = 3;
                this.isScriptRunning = false;
            }
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
