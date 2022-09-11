<template>
    <div class="field">
        <p class="control has-icons-right">
            <input v-model="valueCopy" ref="input" class="input" type="text" placeholder="Value">
            <span class="icon is-small is-right">
                <a href="#" @click.prevent="onEditorOpen">
                    <font-awesome-icon class="code-icon" icon="code" />
                </a>
            </span>
        </p>
    </div>
</template>

<script lang="ts">
    import { Component, Vue, Prop } from 'vue-property-decorator';

    import ValueModal from './ValueModal.vue';
    import { LangSyntax } from './types';

    @Component
    export default class ValueInput extends Vue {
        @Prop({ default: '' }) public readonly value: string;

        public syntax: LangSyntax = LangSyntax.TEXT;

        $refs: {
            input: HTMLInputElement;
        };

        public get valueCopy (): string {
            return this.value;
        }

        private set valueCopy (val: string) {
            this.$emit('input', val.replace(/\r?\n|\r/g, '').replace(/\s/g, ''));
        }

        private onEditorOpen (): void {
            this.$modal.show(ValueModal, {
                syntax: this.syntax,
                value: this.value
            }, { height: 'auto' }, {
                'update:syntax': syntax => this.syntax = syntax,
                'update:value': val => this.valueCopy = val
            });
        }
    }
</script>

<style scoped lang="scss">
    .code-icon {
        pointer-events: all;
    }
</style>
