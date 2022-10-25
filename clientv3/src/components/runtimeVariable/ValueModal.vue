<template>
  <modal-card>
    <template #title>
        <span class="mr-3">Language</span>
        <div class="select is-size-6">
            <select v-model="formatCopy">
                <option :value="ValueFormat.TEXT">text</option>
                <option :value="ValueFormat.YAML">yaml</option>
                <option :value="ValueFormat.JSON">json</option>
            </select>
        </div>
        <button class="format-button button mr-3" @click="onFormat">Format</button>
    </template>
    <template #body>
        <div ref="scriptEditor" class="editor"></div>
    </template>
    <template #footer>
        <div class="buttons">
            <button :disabled="isContentInvalid" class="button is-primary" @click="onApply">
                Apply
            </button>
            <button class="button" @click="$emit('close')">Cancel</button>
        </div>
    </template>
  </modal-card>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
    import * as monaco from 'monaco-editor';

    import ModalCard from '@/components/core/ModalCard.vue';
    import { ValueFormat } from './types';

    @Component({
        name: 'ValueModal',
        components: { ModalCard },
    })
    export default class ValueModal extends Vue {
        @Prop() public readonly format: ValueFormat;
        @Prop() public readonly value: string;

        private scriptEditor: monaco.editor.IStandaloneCodeEditor;
        private formatCopy: ValueFormat = null;
        private ValueFormat = ValueFormat;
        public isContentInvalid = true;

        $refs: {
            scriptEditor: HTMLDivElement;
        };

        private created (): void {
            this.formatCopy = this.format;
        }

        private mounted (): void {
            this.scriptEditor = monaco.editor.create(this.$refs.scriptEditor, {
                value: this.value,
                language: this.format,
                automaticLayout: true,
                formatOnPaste: true,
                minimap: {
                    enabled: false
                }
            });

            this.scriptEditor.onDidChangeModelDecorations(() => {
                const model = this.scriptEditor.getModel();
                const owner = model.getLanguageId();

                this.isContentInvalid = !!monaco.editor.getModelMarkers({ owner }).length;
            });

            setTimeout(() => this.onFormat(), 0);
        }

        private beforeDestroy (): void {
            this.scriptEditor.dispose();
        }

        @Watch('formatCopy')
        private onFormatCopyChange (format) {
            monaco.editor.setModelLanguage(this.scriptEditor.getModel(), format);
        }

        public onFormat (): void {
            this.scriptEditor.getAction('editor.action.formatDocument').run();
        }

        public onApply (): void {
            this.$parent.$emit('update:value', {
                value: this.scriptEditor.getModel().getValue(),
                format: this.formatCopy,
            });
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
