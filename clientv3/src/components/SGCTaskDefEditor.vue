<template>
  <div>

    <modal name="sgs" :classes="'round-popup'" width="700" height="725" background="white">
      <div style="width: 100%; height: 100%; background: white;">
        <table class="table">
          <tr class="tr">
            <td class="td">
              <button class="button" @click="onCloseSgs">Close</button>
            </td>
          </tr>
        </table>
      </div>
    </modal>

  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { StoreType } from '@/store/types';
import { SgAlert, AlertPlacement, AlertCategory } from '@/store/alert/types';
import { showErrors } from '@/utils/ErrorHandler'; 
import { TaskDef } from '../store/taskDef/types';
import { BindStoreModel, BindSelected, BindSelectedCopy, BindProp } from '@/decorator';
import axios from 'axios';

@Component
export default class SGCTaskDef extends Vue {

  
}


</script>

<style scoped lang="scss">
table {
  border-width: 0;
}

td {
  border-width: 0 !important;
}


</style>
