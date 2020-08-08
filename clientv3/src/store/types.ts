// Shared enums and types across the application go here

import { FetchModelDebouncer } from './core/actions';
import PromiseStore from './core/PromiseStore';
import StoreUtils from './core/StoreUtils';

export interface LinkedModel {
  id?: string,
  type?: string,
  url?: string
}

export interface Model extends LinkedModel {
  [key: string]: any
}

export interface RootState {
  [key: string]: any,
  version: string;
}

export interface CoreState {
  [key: string]: any,
  models: Array<Model>;
  selected?: Model;
  selectedCopy?: Model;
  storeUtils?: StoreUtils;
  _storeName: string;
  _url: (action?: string) => string;
  _promiseStore: PromiseStore;
  _fetchModelDebouncer?: FetchModelDebouncer;
};

export enum ModelType {
  job = 'job',
  jobDef = 'jobDef',
  taskdef = 'taskDef',
  stepDef = 'stepDef',
  org = 'org',
  alert = 'alert',
  agent = 'agent'
};

export enum StoreType {
  JobStore = 'jobStore',
  TaskStore = 'taskStore',
  StepStore = 'stepStore',
  TaskOutcomeStore = 'taskOutcomeStore',
  StepOutcomeStore = 'stepOutcomeStore',
  JobDefStore = 'jobDefStore',
  TaskDefStore = 'taskDefStore',
  StepDefStore = 'stepDefStore',
  OrgStore = 'orgStore',
  AlertStore = 'alertStore',
  AgentStore = 'agentStore',
  SecurityStore = 'securityStore',
  ScriptStore = 'scriptStore',
  ScheduleStore = 'scheduleStore',
  OrgVariableStore = 'orgVariableStore',
  ArtifactStore = 'artifactStore',
  InvoiceStore = 'invoiceStore',
  PaymentTransactionStore = 'paymentTransactionStore',
  UserStore = 'userStore'
}

export enum ModelBaseUrlType {
  job = 'job',
  task = 'task',
  step = 'step',
  taskOutcome = 'taskoutcome',
  stepOutcome = 'stepoutcome',
  jobDef = 'jobdef',
  taskdef = 'taskdef',
  stepdef = 'stepdef',
  org = 'org',
  agent = 'agent',
  script = 'script',
  schedule = 'schedule',
  orgVar = 'orgvar',
  artifact = 'artifact',
  invoice = 'invoice',
  paymentTransaction = 'paymenttransaction',
  user = 'user'
}
