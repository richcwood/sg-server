<template>
    <div class="field">
        <p class="control has-icons-right">
            <input :readonly="sensitive && isMasked"
                v-model="valueCopy"
                @change="onChange($event.target.value)"
                placeholder="Value"
                class="input"
                type="text"
                ref="input" />
            <span class="icon is-small is-right px-2">
                <a v-if="sensitive" class="mr-2" href="#" @click.prevent="onToggleMask">
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

    import ValueModal from './ValueModal.vue';
    import { LangSyntax } from './types';

    @Component
    export default class ValueInput extends Vue {
        @Prop({ default: false }) public readonly sensitive: boolean;
        @Prop({ default: '' }) public readonly value: string;

        public syntax: LangSyntax = LangSyntax.TEXT;
        public isMasked: boolean = false;

        $refs: {
            input: HTMLInputElement;
        };

        private created (): void {
            this.isMasked = this.sensitive;
        }

        public get valueCopy (): string {
            return this.isMasked ? '******' : this.value;
        }

        private set valueCopy (val: string) {
            this.$emit('input', val);
        }

        private onChange (val: string): void {
            this.$emit('change', val);
        }

        @Watch('sensitive')
        private onSensitiveChange (val: boolean): void {
            this.isMasked = val;
        }

        private onEditorOpen (): void {
            this.$modal.show(ValueModal, {
                syntax: this.syntax,
                value: this.value
            }, { height: 'auto' }, {
                'update:syntax': syntax => this.syntax = syntax,
                'update:value': val => {
                    this.valueCopy = this.syntax === LangSyntax.JSON
                        ? val.replace(/\r?\n|\r/g, '').replace(/\s/g, '')
                        : val;

                    this.onChange(this.valueCopy);
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
    }
</style>
