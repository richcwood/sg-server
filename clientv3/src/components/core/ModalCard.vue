<template>
    <div class="modal">
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">
                    <slot name="title" />
                </p>
                <button class="delete" @click="onClose" aria-label="close"></button>
            </header>
            <section class="modal-card-body">
                <slot name="body" />
            </section>
            <footer class="modal-card-foot">
                <slot name="footer" />
            </footer>
        </div>
    </div>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';

    @Component({
        name: 'ModalCard'
    })
    export default class ModalCard extends Vue {
        public onClose (): void {
            this.$parent.$emit('close');
        }
    }
</script>

<style lang="scss" scoped>
    div.modal {
        display: flex;
    }
</style>