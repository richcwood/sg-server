<template>
    <div class="field">
        <p class="control has-icons-right">
            <input :readonly="isReadonly"
                v-model="inputValue"
                @change="onChange"
                @click="onClick"
                placeholder="Value"
                class="input"
                type="text"
                ref="input" />
            <span class="icon is-small is-right px-2">
                <a v-if="value.sensitive" class="mr-2" href="#" @click.prevent="onToggleMask">
                    <font-awesome-icon v-if="isMasked" class="action-icon" icon="eye" />
                    <font-awesome-icon v-else class="action-icon" icon="eye-slash" />
                </a>
                <a href="#" @click.prevent="onEditorOpen">
                    <font-awesome-icon class="action-icon" icon="code" />
                </a>
            </span>
        </p>
    </div>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from 'vue-property-decorator';

    import { ValueFormat, KeylessVariable } from './types';
    import ValueModal from './ValueModal.vue';

    @Component
    export default class ValueInput extends Vue {
        @Prop({ default: () => ({}) })
        public readonly value: KeylessVariable;

        public valueCopy: KeylessVariable = null;
        public isMasked: boolean = false;

        $refs: {
            input: HTMLInputElement;
        };

        private created (): void {
            this.isMasked = this.value.sensitive;
            this.valueCopy = Object.assign({
                format: ValueFormat.TEXT,
                sensitive: false,
                value: '',
            }, this.value);
        }

        public get inputValue (): string {
            return this.isMasked ? '******' : this.valueCopy.value;
        }

        private set inputValue (value: string) {
            this.valueCopy.value = value;
            this.emitUpdate({ value });
        }

        private get hasTextFormat (): boolean {
            return this.valueCopy.format === ValueFormat.TEXT;
        }

        public get isReadonly (): boolean {
            return this.isMasked || !this.hasTextFormat;
        }

        private emitUpdate (variable: Partial<KeylessVariable> = {}): void {
            this.$emit('input', Object.assign({}, this.valueCopy, variable));
        }

        private onChange (): void {
            this.$emit('change', this.valueCopy);
        }

        @Watch('value')
        private onValueChange (variable: KeylessVariable): void {
            this.valueCopy = Object.assign({}, this.valueCopy, variable);
        }

        @Watch('value.sensitive')
        private onSensitiveChange (sensitive: boolean): void {
            this.isMasked = sensitive;
        }

        public onClick (): void {
            if (!this.hasTextFormat) {
                this.onEditorOpen();
            }
        }

        private onEditorOpen (): void {
            this.$modal.show(ValueModal, {
                format: this.valueCopy.format,
                value: this.valueCopy.value
            }, { height: 'auto' }, {
                'update:value': ({ value, format }: { value: string; format: ValueFormat }) => {
                    this.valueCopy.format = format;
                    this.valueCopy.value = format === ValueFormat.JSON
                        ? value.replace(/\r?\n|\r/g, '').replace(/\s/g, '')
                        : value;

                    this.emitUpdate();
                    this.onChange();
                }
            });
        }

        public onToggleMask (): void {
            this.isMasked = !this.isMasked;
        }
    }
</script>

<style scoped lang="scss">
    .action-icon {
        pointer-events: all;
    }

    .control.has-icons-right .icon {
        width: auto;
        z-index: 1;
    }
</style>
