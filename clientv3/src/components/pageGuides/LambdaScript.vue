<template>
    <section>
        Hello from Lambda!
    </section>
</template>

<script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';

    @Component
    export default class LambdaScript extends Vue {
        public static getTitle () {
            return 'Lambda Script Guide';
        }
    }
</script>

<style lang="scss" scoped>

</style>
