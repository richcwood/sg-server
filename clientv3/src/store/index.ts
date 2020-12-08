import Vue from 'vue';
import Vuex, { StoreOptions } from 'vuex';
import { RootState } from '@/store/types';
import { securityStore } from '@/store/security'
import { jobStore } from '@/store/job/index';
import { taskStore } from '@/store/task/index';
import { stepStore } from '@/store/step/index';
import { taskOutcomeStore } from '@/store/taskOutcome/index';
import { stepOutcomeStore } from '@/store/stepOutcome/index';
import { jobDefStore } from '@/store/jobDef/index';
import { taskDefStore } from '@/store/taskDef/index';
import { stepDefStore } from '@/store/stepDef/index';
import { teamStore } from '@/store/team/index';
import { alertStore } from '@/store/alert/index';
import { agentStore } from '@/store/agent/index';
import { scriptNameStore } from '@/store/scriptName/index';
import { scriptStore } from '@/store/script/index';
import { userScriptShadowCopyStore } from '@/store/scriptShadow/index';
import { scheduleStore } from '@/store/schedule/index';
import { teamVariableStore } from '@/store/teamVar/index';
import { artifactStore } from '@/store/artifact/index';
import { invoiceStore } from '@/store/invoice/index';
import { paymentTransactionStore } from '@/store/paymentTransaction/index';
import { userStore } from '@/store/user/index';
import { paymentMethodStore } from '@/store/paymentMethod/index';

Vue.use(Vuex);

const store: StoreOptions<RootState> = {
    strict: false, //the @BindSelectedCopy covers this concern process.env.NODE_ENV !== 'production',

    state: {
        version: '1.0.0'
    },

    modules: {       
        securityStore,
        jobStore,
        taskStore,
        stepStore,
        taskOutcomeStore,
        stepOutcomeStore,
        jobDefStore,
        taskDefStore,
        stepDefStore,
        teamStore,
        alertStore,
        agentStore,
        scriptNameStore,
        scriptStore,
        userScriptShadowCopyStore,
        scheduleStore,
        teamVariableStore,
        artifactStore,
        invoiceStore,
        paymentTransactionStore,
        userStore,
        paymentMethodStore
    }
};

export default new Vuex.Store<RootState>(store);
