<template>
    <footer class="main-footer">
        <transition name="guide-button">
            <section v-if="component" class="page-guide">
                <a href="#" class="guide-control is-unselectable px-2" @click.prevent="onTogglePageGuide">
                    <font-awesome-icon icon="angle-up" :class="{'rotate-180': isGuideOpen}" class="angle-icon" />
                    <span class="mx-2">{{ component.getTitle() }}</span>
                    <font-awesome-icon icon="angle-up" :class="{'rotate-180': isGuideOpen}" class="angle-icon" />
                </a>
                <transition name="guide-body">
                    <section v-if="isGuideOpen" class="guide-body sg-container-px">
                        <div class="content pt-4">
                            <div v-if="isGuideOpen" class="is-flex is-justify-content-space-between is-align-items-center">
                                <h2 class="subtitle is-5 mb-0">{{ component.getTitle() }}</h2>
                                <a href="#" @click.prevent="onTogglePageGuide">
                                    <font-awesome-icon icon="times" size="2x" />
                                </a>
                            </div>
                            <Component :is="component" />
                        </div>
                    </section>
                </transition>
            </section>
        </transition>

        <div class="has-text-right footer-info">
            <span v-if="alertFooter" class="footer-message" :class="AlertCategory[alertFooter.category]">{{alertFooter.message}}</span>
            <span v-else>&nbsp;</span>

            <span v-if="alertFooterRight" class="footer-message main-footer-right" :class="AlertCategory[alertFooterRight.category]">{{alertFooterRight.message}}</span>
        </div>
    </footer>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';
    import type { VueConstructor } from 'vue';

    import { SgAlert, AlertCategory } from '@/store/alert/types';
    import { BindStoreModel, BindSelected } from '@/decorator';
    import { StoreType } from '@/store/types';

    @Component
    export default class MainFooter extends Vue {
        public readonly AlertCategory = AlertCategory;

        @BindSelected({ storeType: StoreType.PageGuideStore })
        public component: VueConstructor;

        @BindStoreModel({storeType: StoreType.AlertStore, selectedModelName: 'currentFooter'})
        public alertFooter: SgAlert;

        @BindStoreModel({storeType: StoreType.AlertStore, selectedModelName: 'currentFooterRight'})
        public alertFooterRight: SgAlert;

        public get isGuideOpen (): boolean {
            return this.$store.state[StoreType.PageGuideStore].isGuideOpen;
        }

        public onTogglePageGuide (): void {
            this.$store.dispatch(`${StoreType.PageGuideStore}/togglePageGuide`, !this.isGuideOpen);
        }
    }
</script>

<style lang="scss" scoped>
    .main-footer {
        --footer-height: 29px;

        position: fixed;
        z-index: 2;
        width: 100%;
        background-color: #fff;
        border-top: 1px solid $grey-lighter;
        bottom: 0;

        .footer-info {
            height: var(--footer-height);
            position: relative;
            z-index: 2;
            background-color: #fff;
            padding: 2px 5px;
        }

        .main-footer-right {
            margin-right: 5px;
        }

        .footer-message {
            color: black;
            font-weight: 700;
            margin-left: 10px;
        }

        .footer-message.WARNING{
            color: orange;
        }

        .footer-message.ERROR{
            color: red;
        }

        .guide-body {
            box-shadow: 0 1px 3px rgba(34, 25, 25, .4);
            overflow: auto;
        }

        .page-guide {
            --control-height: 25px;
            --guide-body-height: 33vh;

            position: fixed;
            z-index: 1;
            bottom: var(--footer-height);
            width: 100%;
            background-color: #fff;

            .guide-control {
                height: var(--control-height);
                position: absolute;
                left: 0;
                right: 0;
                top: calc(var(--control-height) * -1);
                width: -webkit-fit-content;
                margin: auto;
                background-color: inherit;
                border: 1px solid $grey-lighter;
                border-bottom: 0;
                border-top-right-radius: 5px;
                border-top-left-radius: 5px;
                color: var(--link-color);
            }

            .guide-control:hover {
                color: #8CC3F2;
            }

            .guide-body {
                height: var(--guide-body-height);
            }

            .guide-body-enter-active,
            .guide-body-leave-active {
                transition: height .3s ease-out;
            }

            .guide-body-enter-to,
            .guide-body-leave {
                height: var(--guide-body-height);
            }

            .guide-body-enter,
            .guide-body-leave-to {
                height: 0;
            }
        }

        .guide-button-enter-active,
        .guide-button-leave-active {
            transition: bottom .3s ease;
        }

        .guide-button-enter-to,
        .guide-button-leave {
            bottom: var(--footer-height);
        }

        .guide-button-enter,
        .guide-button-leave-to {
            bottom: 0;
        }

        .angle-icon {
            transition: transform .3s linear;

            &.rotate-180 {
                transform: rotate(180deg);
            }
        }
    }
</style>
