<template>
    <ValidationObserver ref="observer" disabled tag="div" class="field is-grouped is-align-items-center">
        <div class="control mr-5">
            <label class="checkbox">
                <input type="checkbox" v-model="isSensitive"> Sensitive
            </label>
            <v-popover class="is-inline ml-2">
                <a @click.prevent href="#">
                    <font-awesome-icon icon="question-circle" />
                </a>
                <span slot="popover" class="is-inline-block" style="max-width:300px;">
                    Runtime variables marked as sensitive are hidden by default in the console and redacted in job logs.
                </span>
            </v-popover>
        </div>
        <ValidationProvider name="Variable Key" mode="passive" rules="required" v-slot="{ errors }" tag="div" class="control is-relative">
            <input v-model="variableCopy.key"
                class="input runtime-variable-input"
                type="text"
                style="width: 250px;"
                placeholder="Key"
            />
            <span v-if="errors && errors.length > 0" class="is-absolute error-text has-text-danger">
                {{ errors[0] }}
            </span>
        </ValidationProvider>

        <div class="control has-text-weight-bold">=</div>

        <ValidationProvider name="Variable Value" mode="passive" rules="required_field:value" v-slot="{ errors }" tag="div" class="control is-relative">
            <ValueInput v-model="variableInputValue"
                class="mb-0"
                style="width: 250px;"
                placeholder="value" />
            <span v-if="errors && errors.length > 0" class="is-absolute error-text has-text-danger">
                {{ errors[0]}}
            </span>
        </ValidationProvider>

        <button class="button" @click="onAdd">Add Runtime Variable</button>
    </ValidationObserver>
</template>

<script lang="ts">
    import { ValidationProvider, ValidationObserver } from "vee-validate";
    import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
    import { VPopover } from 'v-tooltip';

    import { Variable, ValueFormat, KeylessVariable } from './types';
    import ValueInput from './ValueInput.vue';

    @Component({
        components: { ValidationProvider, ValidationObserver, ValueInput, VPopover }
    })
    export default class VariableForm extends Vue {
        @Prop({ default: () => ({}) })
        public readonly variable: Variable;

        private variableCopy: Variable = null;
        public isSensitive: boolean = false;

        $refs: {
            observer: InstanceType<typeof ValidationObserver>;
        };

        public created (): void {
            this.variableCopy = Object.assign({
                format: ValueFormat.TEXT,
                sensitive: false,
                value: '',
                key: '',
            }, this.variable);

            this.isSensitive = Boolean(this.variableCopy.sensitive);
        }

        @Watch('variable')
        private copyVariable (variable: Variable): void {
            this.variableCopy = Object.assign({}, variable);

            if (variable.hasOwnProperty('sensitive')) {
                this.isSensitive = Boolean(variable.sensitive);
            }

            this.resetValidation();
        }

        public get variableInputValue (): KeylessVariable {
            return {
                sensitive: false,
                format: this.variableCopy.format,
                value: this.variableCopy.value,
            };
        }

        public set variableInputValue (variable: KeylessVariable) {
            this.variableCopy = Object.assign({}, this.variableCopy, variable);
        }

        public async onAdd (): Promise<void> {
            if (!await this.$refs.observer.validate()) {
                return;
            }

            this.$emit('create', Object.assign({}, this.variableCopy, {
                sensitive: this.isSensitive
            }));

            this.isSensitive = false;
            this.variableCopy = {
                format: ValueFormat.TEXT,
                sensitive: false,
                value: '',
                key: ''
            };

            this.resetValidation();
        }

        private resetValidation (): void {
            requestAnimationFrame(() => {
                this.$refs.observer.reset();
            });
        }
    }
</script>

<style scoped lang="scss">
    .code-icon {
        pointer-events: all;
    }

    .error-text {
        left: 0;
        top: 100%;
    }
</style>
