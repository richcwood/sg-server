<template>
    <ValidationObserver tag="div" ref="createAgentAccessKeyValidationObserver" v-slot="{ invalid }">
        <ModalCard>
            <template #title>
                <span>Create an Agent API Access Key</span>
            </template>
            <template #body>
                <div class="field">
                    <label class="label">Description</label>
                    <ValidationProvider
                        tag="div"
                        class="control"
                        name="Key Description"
                        rules="required|object-name"
                        v-slot="{ errors }"
                    >
                        <input class="input" type="text" v-model="description" />
                        <p v-if="errors && errors.length > 0" class="help is-danger">{{ errors[0] }}</p>
                    </ValidationProvider>
                </div>
            </template>
            <template #footer>
                <div class="buttons">
                    <button class="button is-primary" @click="onCreate" :disabled="invalid">Create Access Key</button>
                    <button class="button" @click="onCancel">Cancel</button>
                </div>
            </template>
        </ModalCard>
    </ValidationObserver>
</template>

<script lang="ts">
import { ValidationProvider, ValidationObserver } from 'vee-validate';
import { Component, Vue } from 'vue-property-decorator';

import { AlertCategory, AlertPlacement, SgAlert } from '@/store/alert/types';
import ModalCard from '@/components/core/ModalCard.vue';
import { AccessKeyType } from '@/store/accessKey/types';
import { showErrors } from '@/utils/ErrorHandler';
import { StoreType } from '@/store/types';

@Component({
    components: { ValidationProvider, ValidationObserver, ModalCard },
    name: 'CreateAccessKeyModal',
})
export default class CreateAccessKeyModal extends Vue {
    public description: string = '';

    public async onCreate() {
        let accessSecret = null;
        let accessKey = null;

        try {
            const newAccessKey: any = {
                description: this.description,
                accessKeyType: AccessKeyType.AGENT,
            };

            const newAccessKeyResult = await this.$store.dispatch(`${StoreType.AccessKeyStore}/save`, newAccessKey);

            this.$store.dispatch(
                `${StoreType.AlertStore}/addAlert`,
                new SgAlert('Created new agent access key', AlertPlacement.FOOTER, AlertCategory.INFO)
            );

            accessSecret = newAccessKeyResult.accessKeySecret;
            accessKey = newAccessKeyResult.accessKeyId;
        } catch (err) {
            console.error(err);
            showErrors('Error creating access key.', err);
        }

        this.$parent.$emit('accessKey:created', {
            accessSecret,
            accessKey,
        });
        this.$emit('close');
    }

    public onCancel() {
        this.$emit('close');
    }
}
</script>