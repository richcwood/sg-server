<template>
    <div class="field">
        <p class="control has-icons-right">
            <input v-model="value" ref="input" class="input" type="text" placeholder="Value">
            <span class="icon is-small is-right">
                <a href="#" @click.prevent="onEditorOpen">
                    <font-awesome-icon class="code-icon" icon="code" />
                </a>
            </span>
        </p>
    </div>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';

    import ValueModal from './ValueModal.vue';
    import { LangSyntax } from './types';

    @Component
    export default class ValueInput extends Vue {
        public syntax: LangSyntax = LangSyntax.TEXT;
        public value: string = '';

        $refs: {
            input: HTMLInputElement;
        };

        private onEditorOpen (): void {
            this.$modal.show(ValueModal, {
                syntax: this.syntax,
                value: this.value
            }, { height: 'auto' }, {
                'update:value': val => this.value = val.replace(/\r?\n|\r/g, '').replace(/\s/g, ''),
                'update:syntax': syntax => this.syntax = syntax
            });
        }
    }
</script>

<style scoped lang="scss">
    .code-icon {
        pointer-events: all;
    }
</style>
