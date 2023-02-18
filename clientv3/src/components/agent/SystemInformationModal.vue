<template>
    <modal-card>
        <template #title>{{ agentName }}'s System Information</template>
        <template #body>
            <pre v-if="systemInformation">{{ systemInformation }}</pre>
            <div v-else>System information is not available for this agent.</div>
        </template>
        <template #footer>
            <button class="button" @click="$emit('close')">Close</button>
        </template>
    </modal-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import ModalCard from '@/components/core/ModalCard.vue';

@Component({
    name: 'SystemInformationModal',
    components: { ModalCard },
})
export default class ScriptModal extends Vue {
    @Prop({ required: false })
    public systemInformation: string;

    @Prop({ required: true })
    public agentName: string;
}
</script>
