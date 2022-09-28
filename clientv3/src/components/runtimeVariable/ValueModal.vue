<template>
  <modal-card>
    <template #title>
        <span class="mr-3">Language</span>
        <div class="select is-size-6">
            <select v-model="syntaxCopy">
                <option :value="LangSyntax.TEXT">text</option>
                <option :value="LangSyntax.YAML">yaml</option>
                <option :value="LangSyntax.JSON">json</option>
            </select>
        </div>
        <button class="format-button button mr-3" @click="onFormat">Format</button>
    </template>
    <template #body>
        <div ref="scriptEditor" class="editor"></div>
    </template>
    <template #footer>
        <div class="buttons">
            <button class="button is-primary" @click="onApply">Apply</button>
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

            // monaco.editor.onDidChangeModelDecorations(() => {
            //     const model = editor.getModel();
            //     const markers = monaco.editor.getModelMarkers(model);

            //     console.log({ markers })
            // });

            // monaco.editor.onDidChangeMar

            setTimeout(() => this.onFormat(), 0);
        }

        private beforeDestroy (): void {
            this.scriptEditor.dispose();
        }

        @Watch('syntaxCopy')
        private onSyntaxCopyChange (syntax) {
            monaco.editor.setModelLanguage(this.scriptEditor.getModel(), syntax);
        }

        public onFormat (): void {
            this.scriptEditor.getAction('editor.action.formatDocument').run();

            this.scriptEditor.getModel().
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

    .format-button {
        margin-left: auto;
    }

    ::v-deep {
        .modal-card-head {
            padding-bottom: 10px;
            padding-top: 10px;
        }

        .modal-card-title {
            display: flex;
            align-items: center;
        }
    }
</style>
