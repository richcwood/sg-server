<template>
    <validation-observer ref="observer" v-slot="{ invalid }" tag="div" class="field is-grouped is-align-items-center">
        <div class="control mr-5">
            <label class="checkbox">
                <input type="checkbox" v-model="variableCopy.sensitive"> Sensitive
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
        <validation-provider name="Variable Key" rules="required" v-slot="{ errors }" tag="div" class="control is-relative">
            <input v-model="variableCopy.key"
                class="input runtime-variable-input"
                type="text"
                style="width: 250px;"
                placeholder="Key"
            />
            <span v-if="errors && errors.length > 0" class="is-absolute error-text has-text-danger">
                {{ errors[0] }}
            </span>
        </validation-provider>

        <div class="control has-text-weight-bold">=</div>

        <validation-provider name="Variable Value" rules="required" v-slot="{ errors }" tag="div" class="control is-relative">
            <ValueInput v-model="variableCopy.value"
                class="mb-0"
                style="width: 250px;"
                placeholder="value" />
            <span v-if="errors && errors.length > 0" class="is-absolute error-text has-text-danger">
                {{ errors[0]}}
            </span>
        </validation-provider>

        <button class="button" :disabled="invalid" @click="onAdd">Add Runtime Variable</button>
    </validation-observer>
</template>

<script lang="ts">
    import { ValidationProvider, ValidationObserver } from "vee-validate";
    import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
    import { VPopover } from 'v-tooltip';

    import ValueInput from './ValueInput.vue';
    import { Variable } from './types';

    @Component({
        components: { ValidationProvider, ValidationObserver, ValueInput, VPopover }
    })
    export default class VariableForm extends Vue {
        @Prop({ default: () => ({
            sensitive: false,
            value: '',
            key: '',
        }) })
        public readonly variable: Variable;
        private variableCopy: Variable = null;

        $refs: {
            observer: any;
        };

        public created (): void {
            this.copyVariable(this.variable);
        }

        @Watch('variable')
        private copyVariable (variable: Variable): void {
            this.variableCopy = Object.assign({}, variable);
        }

        public onAdd (): void {
            this.$emit('create', this.variableCopy);

            this.variableCopy = {
                sensitive: false,
                value: '',
                key: ''
            };

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
