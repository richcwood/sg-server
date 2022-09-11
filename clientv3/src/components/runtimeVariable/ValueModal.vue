<template>
  <modal-card>
    <template #title>
        <select v-model="syntaxCopy">
            <option :value="LangSyntax.TEXT">text</option>
            <option :value="LangSyntax.YAML">yaml</option>
            <option :value="LangSyntax.JSON">json</option>
        </select>
    </template>
    <template #body>
        <div ref="scriptEditor" class="editor"></div>
    </template>
    <template #footer>
        <div class="buttons">
            <button class="button" @click="onApply">Apply</button>
            <button class="button" @click="$emit('close')">Cancel</button>
        </div>
    </template>
  </modal-card>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
    import * as monaco from 'monaco-editor';

    import ModalCard from '@/components/core/ModalCard.vue';
    import { LangSyntax } from './types';

    @Component({
        name: 'ValueModal',
        components: { ModalCard },
    })
    export default class ValueModal extends Vue {
        @Prop() public readonly syntax: LangSyntax;
        @Prop() public readonly value: string;

        private scriptEditor: monaco.editor.IStandaloneCodeEditor;
        private syntaxCopy: LangSyntax = null;
        private LangSyntax = LangSyntax;

        $refs: {
            scriptEditor: HTMLDivElement;
        };

        private created (): void {
            this.syntaxCopy = this.syntax;
        }

        private mounted (): void {
            this.scriptEditor = monaco.editor.create(this.$refs.scriptEditor, {
                value: this.value,
                language: this.syntax,
                automaticLayout: true,
                formatOnPaste: true,
                minimap: {
                    enabled: false
                }
            });

            setTimeout(() => {
                this.scriptEditor.getAction('editor.action.formatDocument').run();
            }, 0);
        }

        private beforeDestroy (): void {
            this.scriptEditor.dispose();
        }

        @Watch('syntaxCopy')
        private onSyntaxCopyChange (syntax) {
            monaco.editor.setModelLanguage(this.scriptEditor.getModel(), syntax);
        }

        public onApply (): void {
            this.$parent.$emit('update:value', this.scriptEditor.getModel().getValue());
            this.$parent.$emit('update:syntax', this.syntaxCopy);
            this.$emit('close');
        }
    }
</script>

<style lang="scss" scoped>
    .editor {
        width: 100%;
        height: 450px;
        background: hsl(0, 0%, 98%);
    }
</style>
