<template>
    <modal-card>
        <template #title>
            Script for step: {{ stepOutcome.name }}
        </template>
        <template #body>
            <div v-if="stepOutcome.runCode" v-html="'<pre>' + codeOutput + '</pre>'"></div>
            <div v-else>
                Code was missing
            </div>
        </template>
        <template #footer>
            <button class="button" @click="$emit('close')">Close</button>
        </template>
    </modal-card>
</template>

<script lang="ts">
    import { Component, Vue, Prop } from 'vue-property-decorator';

    import { StepOutcome } from '@/store/stepOutcome/types';
    import ModalCard from '@/components/core/ModalCard.vue';

    @Component({
        name: 'ScriptModal',
        components: { ModalCard }
    })
    export default class ScriptModal extends Vue {
        @Prop({ required: false })
        public stepOutcome: StepOutcome;

        public get codeOutput (): string {
            if (this.stepOutcome.runCode) {
                return atob(this.stepOutcome.runCode).replace(/</g, "&#60;").replace(/>/g, "&#62;");
            } else {
                return '';
            }
        }
    }
</script>

<style lang="scss" scoped>
    /deep/ .modal-card-body,
    /deep/ pre {
        background: var(--code-background-color);
        color: white;
    }
</style>
