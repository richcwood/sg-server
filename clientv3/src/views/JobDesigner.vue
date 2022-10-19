<template>
  <div @mousemove="onMouseMove" @mouseup="onMouseUp">
    <!-- Modals -->

    <modal name="select-script-vars-modal" :classes="'round-popup'" :width="600" :height="750">
      <table class="table" width="100%">
        <tr class="tr">
          <td class="td" colspan="2">
            Here are all the @sgg variables referenced in this job's related scripts.
            <br />
            Click one to add a runtime variable.
            <br />
            <br />
          </td>
        </tr>
        <tr class="tr" v-if="scriptSggs.length === 0">
          <td class="td">
            No @sgg variables were found in any of the scripts related to this job.
          </td>
        </tr>
        <table v-else class="table sgg-list">
          <tr class="tr">
            <td class="td"><b>@sgg</b></td>
            <td class="td"><b>Scripts that use the @sgg</b></td>
          </tr>
          <tr class="tr" v-for="sgg of scriptSggs" v-bind:key="`sgg-${sgg}`">
            <td class="td">
              <template v-if="selectScriptsType === 'runtime-vars'">
                <span v-if="jobDefForEdit.runtimeVars[sgg]">{{ sgg }}</span>
                <a v-else @click="onClickedAddSggAsVar(sgg)">{{ sgg }}</a>
              </template>
              <template v-else>
                <span v-if="runJobVars[sgg]">{{ sgg }}</span>
                <a v-else @click="onClickedAddSggAsVar(sgg)">{{ sgg }}</a>
              </template>
            </td>
            <td class="td">
              <span v-for="scriptName of scriptsBySggs[sgg]" v-bind:key="`sgg-${sgg}-${scriptName}`">
                {{ scriptName }} <br />
              </span>
            </td>
          </tr>
        </table>

        <tr class="tr">
          <td class="td">
            <button class="button" @click="onCloseSelectScriptVarsClicked">Close</button>
          </td>
        </tr>
      </table>
    </modal>

    <modal name="create-taskdef-modal-choose-target" :classes="'round-popup'" :width="400" :height="325">
      <table class="table" width="100%" height="100%">
        <tr class="tr">
          <td class="td">
            What type of task do you want?
            <br /><br />
            An AWS Lambda task runs in a SaaSGlue managed AWS account rather than on one of your agents.
            <br />
            <br />
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="createNewTaskDef">Create Regular Task</button>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="createNewAWSLambdaTaskDef">Create AWS Lambda Task</button>
          </td>
        </tr>
        <tr class="tr">
          <td class="td">
            <button class="button" @click="cancelCreateNewTaskDef_chooseTarget">Cancel</button>
          </td>
        </tr>
      </table>
    </modal>

    <modal name="create-taskdef-modal" :classes="'round-popup'" :width="450" :height="275">
      <validation-observer ref="newTaskValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                Create a new <span v-if="isAWSLambdaTaskDefType(newTaskTarget)">AWS Lambda</span> task
                <template v-if="isAWSLambdaTaskDefType(newTaskTarget)">
                  <br /><br />
                  An AWS Lambda task runs in a SaaSGlue managed AWS account rather than on one of your agents.
                </template>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">Task Name</td>
              <td class="td">
                <validation-provider name="Task Name" rules="required|object-name" v-slot="{ errors }">
                  <input
                    id="create-taskdef-modal-autofocus"
                    class="input"
                    type="text"
                    v-on:keyup.enter="saveNewTaskDef"
                    autofocus
                    v-model="newTaskName"
                    placeholder="Enter the new task name"
                  />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="saveNewTaskDef">Create new task</button>
                <button class="button button-spaced" @click="cancelCreateNewTaskDef">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </validation-observer>
    </modal>

    <modal name="delete-taskdef-modal" :classes="'round-popup'" :width="400" :height="125">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              Delete the task <b>{{ taskDefToDelete && taskDefToDelete.name }}</b
              >?
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button is-danger" @click="deleteTaskDef">Delete Task</button>
              <button class="button button-spaced" @click="cancelDeleteTaskDef">Cancel</button>
            </td>
          </tr>
        </tbody>
      </table>
    </modal>

    <modal name="create-stepdef-modal" :classes="'round-popup'" :width="400" :height="200">
      <validation-observer ref="newStepValidationObserver">
        <table class="table" width="100%" height="100%">
          <tbody class="tbody">
            <tr class="tr">
              <td class="td"></td>
              <td class="td">Create a new step</td>
            </tr>
            <tr class="tr">
              <td class="td">Step Name</td>
              <td class="td">
                <validation-provider name="Step Name" rules="required|object-name" v-slot="{ errors }">
                  <input
                    class="input"
                    id="create-stepdef-modal-autofocus"
                    type="text"
                    v-on:keyup.enter="saveNewStepDef"
                    autofocus
                    v-model="newStepName"
                    placeholder="Enter the new step name"
                  />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="saveNewStepDef">Create new step</button>
                <button class="button button-spaced" @click="cancelCreateNewStepDef">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </validation-observer>
    </modal>

    <modal name="delete-stepdef-modal" :classes="'round-popup'" :width="400" :height="125">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              Delete the step <b>{{ stepDefToDelete && stepDefToDelete.name }}</b
              >?
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button is-danger" @click="deleteStepDef">Delete Step</button>
              <button class="button button-spaced" @click="cancelDeleteStepDef">Cancel</button>
            </td>
          </tr>
        </tbody>
      </table>
    </modal>

    <modal name="create-stepdefvariable-modal" :classes="'round-popup'" :width="500" :height="300">
      <validation-observer ref="newStepDefVariableValidationObserver">
        <table v-if="selectedStepDefForEdit" class="table" width="100%" height="100%">
          <tbody class="tbody">
            <tr class="tr">
              <td class="td"></td>
              <td class="td">Create a new variable for step {{ selectedStepDefForEdit.name }}</td>
            </tr>
            <tr class="tr">
              <td class="td">Variable Key</td>
              <td class="td">
                <validation-provider name="Variable Key" rules="required|object-name" v-slot="{ errors }">
                  <input
                    class="input"
                    id="create-stepdefvariable-modal-autofocus"
                    type="text"
                    v-on:keyup.enter="saveNewTaskDef"
                    autofocus
                    v-model="newVariableKey"
                    placeholder="Enter the new variable key"
                  />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">Variable Value</td>
              <td class="td">
                <validation-provider name="Variable Value" rules="required" v-slot="{ errors }">
                  <input
                    class="input"
                    type="text"
                    v-on:keyup.enter="saveNewTaskDef"
                    autofocus
                    v-model="newVariableValue"
                    placeholder="Enter the new variable value"
                  />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" @click="createNewStepDefVariable">Create new variable</button>
                <button class="button button-spaced" @click="cancelCreateNewStepDefVariable">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </validation-observer>
    </modal>

    <modal name="edit-schedule-modal" classes="round-popup edit-schedule-modal" :width="700" :height="900">
      <ModalCard>
        <template #title>
          <span v-if="editSchedule.id"> Edit the schedule {{ editSchedule.name }} </span>
          <span v-else> Create a new schedule {{ editSchedule.name }} </span>
        </template>
        <template #body>
          <ValidationObserver ref="editScheduleValidationObserver" tag="div">
            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label">Name</label>
              </div>
              <div class="field-body">
                <ValidationProvider tag="div" class="field" name="Schedule Name" rules="required|object-name" v-slot="{ errors }">
                  <div class="control">
                    <input class="input" style="width: 250px;" type="text" v-model="editSchedule.name" />
                    <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                  </div>
                </ValidationProvider>
              </div>
            </div>

            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label">Type</label>
              </div>
              <div class="field-body">
                <ValidationProvider tag="div" class="field is-narrow" name="Trigger Type" rules="required" v-slot="{ errors }">
                  <div class="control">
                    <div class="select">
                      <select v-model="editSchedule.TriggerType" style="width: 250px;">
                        <option
                          v-for="(value, key) in ScheduleTriggerType"
                          v-bind:key="`triggerType${key}-${value}`"
                          :value="key">
                          {{ value }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </ValidationProvider>
              </div>
            </div>

            <div class="field is-horizontal">
              <div class="field-label is-normal">
                <label class="label">Is Active</label>
              </div>
              <div class="field-body is-align-items-center">
                <div class="field">
                  <div class="control">
                    <label class="checkbox">
                      <input type="checkbox" v-model="editSchedule.isActive" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="editSchedule.TriggerType === ScheduleTriggerType.date"
              class="field is-horizontal">
                <div class="field-label is-normal">
                  <label class="label">Run Date</label>
                </div>
                <div class="field-body">
                  <ValidationProvider tag="div" class="field" name="Run Date" rules="required|datetime" v-slot="{ errors }">
                    <p class="control">
                      <input
                        class="input"
                        type="datetime-local"
                        style="width: 250px;"
                        v-model="editSchedule.RunDate"
                      />
                    </p>
                    <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                  </ValidationProvider>
                </div>
            </div>

            <template v-if="editSchedule.TriggerType === ScheduleTriggerType.interval">
                <div class="field is-horizontal">
                  <div class="field-label is-normal">
                    <label class="label">Weeks</label>
                  </div>
                  <div class="field-body">
                    <ValidationProvider tag="div" class="field is-narrow" name="Weeks" rules="required_if_empty:@Days,@Hours,@Minutes" v-slot="{ errors }">
                      <div class="control" style="width: 250px;">
                        <input v-model="editSchedule_interval.Weeks" type="text" class="input" />
                        <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                      </div>
                    </ValidationProvider>
                    <ValidationProvider tag="div" name="Days" class="field is-narrow" style="margin-top: -32px;" rules="required_if_empty:@Weeks,@Hours,@Minutes" v-slot="{ errors }">
                      <label class="label">Days</label>
                      <div class="control" style="width: 60px;">
                        <input v-model="editSchedule_interval.Days" type="text" class="input" placeholder="1-7" />
                        <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                      </div>
                    </ValidationProvider>
                    <ValidationProvider tag="div" name="Hours" class="field is-narrow" style="margin-top: -32px;" rules="required_if_empty:@Days,@Weeks,@Minutes" v-slot="{ errors }">
                      <label class="label">Hours</label>
                      <div class="control" style="width: 60px;">
                        <input class="input" type="text" v-model="editSchedule_interval.Hours" placeholder="0-23" />
                        <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                      </div>
                    </ValidationProvider>
                    <ValidationProvider name="Minutes" tag="div" class="field is-narrow" style="margin-top: -32px;" rules="required_if_empty:@Days,@Hours,@Weeks" v-slot="{ errors }">
                      <label class="label">Minutes</label>
                      <div class="control" style="width: 60px;">
                        <input class="input" type="text" v-model="editSchedule_interval.Minutes" placeholder="0-59" />
                        <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                      </div>
                    </ValidationProvider>
                  </div>
                </div>
                <div class="field is-horizontal">
                  <div class="field-label is-normal">
                    <label class="label">Start Date</label>
                  </div>
                  <div class="field-body">
                    <div class="field">
                      <div class="control" style="width: 250px;">
                        <input class="input" type="date" v-model="editSchedule_interval.Start_Date" />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="field is-horizontal">
                  <div class="field-label is-normal">
                    <label class="label">End Date</label>
                  </div>
                  <div class="field-body">
                    <div class="field">
                      <div class="control" style="width: 250px;">
                        <input class="input" type="date" v-model="editSchedule_interval.End_Date" />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="field is-horizontal">
                  <div class="field-label is-normal">
                    <div class="label">Jitter</div>
                  </div>
                  <div class="field-body">
                    <div class="field">
                      <div class="control" style="width: 250px;">
                        <input class="input" type="text" v-model="editSchedule_interval.Jitter" />
                      </div>
                    </div>
                  </div>
                </div>
            </template>

            <template v-if="editSchedule.TriggerType === ScheduleTriggerType.cron">
              <div class="field is-horizontal">
                <div class="field-label is-normal">
                  <div class="label"></div>
                </div>
                <div class="field-body">
                  <ValidationProvider rules="required_if_empty:@Month,@Day,@Week,@WeekDay,@Hour,@Minute,@Second" name="Year" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Year</label>
                    <div class="control" style="width: 65px;">
                      <input v-model="editSchedule_cron.Year" type="text" class="input" placeholder="YYYY" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                  <ValidationProvider rules="required_if_empty:@Year,@Day,@Week,@WeekDay,@Hour,@Minute,@Second" name="Month" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Month</label>
                    <div class="control" style="width: 55px;">
                      <input v-model="editSchedule_cron.Month" type="text" class="input" placeholder="1-12" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                  <ValidationProvider rules="required_if_empty:@Year,@Month,@Week,@WeekDay,@Hour,@Minute,@Second" name="Day" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Day</label>
                    <div class="control" style="width: 55px;">
                      <input v-model="editSchedule_cron.Day" type="text" class="input" placeholder="1-31" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                  <ValidationProvider rules="required_if_empty:@Year,@Month,@Day,@WeekDay,@Hour,@Minute,@Second" name="Week" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Week</label>
                    <div class="control" style="width: 60px;">
                      <input v-model="editSchedule_cron.Week" type="text" class="input" placeholder="1-53" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                  <ValidationProvider rules="required_if_empty:@Year,@Month,@Day,@Week,@Hour,@Minute,@Second" name="WeekDay" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Day of Week</label>
                    <div class="control" style="width: 140px;">
                      <input v-model="editSchedule_cron.Day_Of_Week" type="text" class="input" placeholder="0-6 or mon-sun" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                  <ValidationProvider rules="required_if_empty:@Year,@Month,@Day,@Week,@WeekDay,@Minute,@Second" name="Hour" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Hour</label>
                    <div class="control" style="width: 60px;">
                      <input v-model="editSchedule_cron.Hour" type="text" class="input" placeholder="0-23" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                  <ValidationProvider rules="required_if_empty:@Year,@Month,@Day,@Week,@WeekDay,@Hour,@Second" name="Minute" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Minute</label>
                    <div class="control" style="width: 60px;">
                      <input v-model="editSchedule_cron.Minute" type="text" class="input" placeholder="0-59" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                  <ValidationProvider rules="required_if_empty:@Year,@Month,@Day,@Week,@WeekDay,@Hour,@Minute" name="Second" tag="div" class="field is-narrow" v-slot="{ errors }">
                    <label class="label">Second</label>
                    <div class="control" style="width: 60px;">
                      <input v-model="editSchedule_cron.Second" type="text" class="input" placeholder="0-59" />
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </ValidationProvider>
                </div>
              </div>
              <div class="field is-horizontal">
                <div class="field-label is-normal">
                  <label class="label">Start Date</label>
                </div>
                <div class="field-body">
                  <div class="field">
                    <div class="control" style="width: 250px;">
                      <input class="input" type="date" v-model="editSchedule_cron.Start_Date" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="field is-horizontal">
                <div class="field-label is-normal">
                  <label class="label">End Date</label>
                </div>
                <div class="field-body">
                  <div class="field">
                    <div class="control" style="width: 250px;">
                      <input class="input" type="date" v-model="editSchedule_cron.End_Date" />
                    </div>
                  </div>
                </div>
              </div>
              <ValidationProvider tag="div" class="field is-horizontal" name="Timezone" rules="required" v-slot="{ errors }">
                <div class="field-label is-normal">
                  <label class="label">Timezone</label>
                </div>
                <div class="field-body">
                  <div class="fiel">
                    <div class="control">
                      <div class="select" style="width: 300px;">
                        <select class="select" v-model="editSchedule_cron.Timezone">
                          <option
                            class="option"
                            v-for="zone in timeZones"
                            :key="zone.value"
                            :value="zone.value"
                            >{{ zone.label }}</option
                          >
                        </select>
                      </div>
                      <p v-if="errors.length" class="help is-danger">{{ errors[0] }}</p>
                    </div>
                  </div>
                </div>
              </ValidationProvider>
              <div class="field is-horizontal">
                <div class="field-label is-normal">
                  <div class="label">Jitter</div>
                </div>
                <div class="field-body">
                  <div class="field">
                    <div class="control" style="width: 250px;">
                      <input class="input" type="text" v-model="editSchedule_cron.Jitter" />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </ValidationObserver>

          <VariableList v-model="editSchedule.runtimeVars" class="mt-5" />
        </template>
        <template #footer>
          <div class="buttons">
            <button class="button is-primary" @click="onCreateSchedule">
              <template v-if="editSchedule.id">
                Save schedule
              </template>
              <template v-else>
                Create new schedule
              </template>
            </button>
            <button class="button" @click="onCancelCreateSchedule">Cancel</button>
          </div>
        </template>
      </ModalCard>
    </modal>

    <modal name="delete-schedule-modal" :classes="'round-popup'" :width="200" :height="200">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td">Confirmation</td>
          </tr>
          <tr class="tr">
            <td class="td">Do you really want delete the schedule {{ scheduleToDelete && scheduleToDelete.name }}?</td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button class="button is-primary" @click="deleteSchedule">Yes</button>
              <button class="button button-spaced" @click="cancelDeleteSchedule">Cancel</button>
            </td>
          </tr>
        </tbody>
      </table>
    </modal>

    <modal name="route-all-to-taskdef-modal" :classes="'round-popup'" :width="500" :height="300">
      <table class="table" width="100%" height="100%">
        <tbody class="tbody">
          <tr class="tr">
            <td class="td"></td>
            <td class="td"></td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              Create an out bound route from <strong>every available task</strong> to the task
              <b>{{ selectedTaskDefForDesigner && selectedTaskDefForDesigner.name }}</b
              >?
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <validation-observer ref="routeAllToTaskDefRouteValidationObserver">
                <validation-provider name="Route" rules="valid-regex" v-slot="{ errors }">
                  <input
                    type="input"
                    v-model="outboundRouteKey"
                    class="input"
                    style="width: 250px;"
                    placeholder="Regex"
                  />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    <br />{{ errors[0] }}
                  </div>
                </validation-provider>
              </validation-observer>
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
            <td class="td">
              <button class="button is-primary" @click="createOutboundRoutes">Create Out Bound Routes</button>
              <button class="button button-spaced" @click="cancelCreateOutboundRoutes">Cancel</button>
            </td>
          </tr>
        </tbody>
      </table>
    </modal>

    <div class="sg-container-px">
      <header class="is-flex py-2">
        <h2 class="is-size-3 has-text-weight-bold text-ellipsis" :title="jobDefForEdit.name">
          {{ jobDefForEdit.name }}
        </h2>
        <ul class="job-menu is-flex is-align-items-center has-text-weight-bold is-size-5 ml-6">
          <li>
            <a
              @click.prevent="
                activeTab = JobTab.SCHEDULES;
                selectedItemForNav = null;
              "
              :class="{ 'is-active': activeTab === JobTab.SCHEDULES }"
              class="px-1"
              href="#"
              >Schedules</a
            >
          </li>
          <li>
            <a
              @click.prevent="
                activeTab = JobTab.RUN;
                selectedItemForNav = null;
              "
              :class="{ 'is-active': activeTab === JobTab.RUN }"
              class="px-1"
              href="#"
              >{{ runTabTitle }}</a
            >
          </li>
          <li>
            <a
              @click.prevent="
                activeTab = JobTab.SETTINGS;
                selectedItemForNav = null;
              "
              :class="{ 'is-active': activeTab === JobTab.SETTINGS }"
              class="px-1"
              href="#"
              >Settings</a
            >
          </li>
          <li>
            <a
              @click.prevent="
                activeTab = JobTab.VARIABLES;
                selectedItemForNav = null;
              "
              :class="{ 'is-active': activeTab === JobTab.VARIABLES }"
              class="px-1 text-nowrap"
              href="#"
              >Runtime Variables</a
            >
          </li>
          <li>
            <a
              @click.prevent="
                activeTab = JobTab.DESIGNER;
                selectedItemForNav = null;
              "
              :class="{ 'is-active': activeTab === JobTab.DESIGNER }"
              class="px-1 text-nowrap"
              href="#"
              >Workflow Designer</a
            >
          </li>
        </ul>
      </header>
    </div>

    <!-- <hr class="navbar-divider"> -->

    <!-- Job tasks / steps navigation / selection -->
    <div ref="navPanel" class="nav-job" v-if="jobDefForEdit" :style="{ width: navPanelWidth + 'px' }">
      <div class="ml-4 pr-3 field">
        <p class="control has-icons-left">
          <input placeholder="Filter By Task Name" v-model.trim="taskSearchTerm" type="text" class="input" />
          <span class="icon is-small is-left">
            <font-awesome-icon icon="search" />
          </span>
        </p>
      </div>
      <div class="mt-4 ml-4">
        <div
          class="dropdown"
          v-click-outside="onClickedOutsideNavCreateMenu"
          :class="{ 'is-active': showCreateItemMenu }"
        >
          <div class="dropdown-trigger">
            <button
              class="button"
              @click="onClickedCreateItemFromNav"
              aria-haspopup="true"
              aria-controls="dropdown-menu"
            >
              Create
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu" role="menu">
            <div class="dropdown-content">
              <a class="dropdown-item" @click.prevent="onNavMenuCreateTaskClicked">Create Task</a>
              <a class="dropdown-item" @click.prevent="onNavMenuCreateAWSLambdaTaskClicked">Create AWS Lambda Task</a>
              <span v-if="selectedTaskDefForEdit === null" class="dropdown-item" style="color: lightgray;"
                >Create Step</span
              >
              <a v-else class="dropdown-item" @click.prevent="onNavMenuCreateStepClicked">Create Step</a>
            </div>
          </div>
        </div>

        <button
          class="button ml-2"
          :disabled="!selectedTaskDefForEdit && !selectedStepDefForEdit"
          @click="onNavMenuDeleteClicked"
        >
          Delete
        </button>
      </div>

      <div class="is-divider my-4"></div>

      <div
        class="is-clickable ml-4"
        v-for="taskDef in filteredTaskDefs"
        :class="{ selected: taskDef === selectedItemForNav }"
        :key="taskDef.id"
        @click="selectItemForNav(taskDef)"
      >
        <span class="icon-text has-max-width is-flex-wrap-nowrap is-inline-block icon-text-helper">
          <img class="icon task-step-icon" src="@/assets/images/task-icon.svg" />
          <span class="text-ellipsis" :title="taskDef.name">
            <span v-html="highlightTaskName(taskDef.name)"></span>
            <span v-if="isAWSLambdaTaskDefType(taskDef.target)">(lambda)</span>
          </span>
        </span>

        <template v-if="!isAWSLambdaTaskDefType(taskDef.target)">
          <div
            class="ml-5 is-clickable"
            v-for="stepDef in stepDefsCache[taskDef.id]"
            :class="{ selected: stepDef === selectedItemForNav }"
            :key="stepDef.id"
            @click.stop="selectItemForNav(stepDef)"
          >
            <span class="text-ellipsis icon-text has-max-width is-flex-wrap-nowrap is-inline-block icon-text-helper">
              <img class="icon task-step-icon" src="@/assets/images/step-icon.svg" />
              <span :title="stepDef.name">{{ stepDef.name }}</span>
            </span>
          </div>
        </template>
      </div>
    </div>

    <!-- For resizing the nav panel -->
    <div class="nav-job-resizer" @mousedown="onResizerMouseDown">
      <div class="col-resizer-icon"></div>
    </div>

    <!-- Edit job, including task routes designer -->
    <!-- <div class="edit-job" v-if="jobDefForEdit && selectedItemForNav && selectedItemForNav.id === jobDefForEdit.id" :style="{'margin-left': editPanelMarginLeft+'px'}"> -->

    <!-- <tabs :defaultIndex="4" :onSelect="onTabSelected" :style="{'background': 'lightskyblue'}"> -->

    <div class="tabs-container" :style="{ 'margin-left': editPanelMarginLeft + 'px' }">
      <div class="tabs-container-item" v-if="activeTab === JobTab.SCHEDULES">
        <table class="table" style="background-color: inherit;">
          <tr class="tr">
            <td class="td"></td>
          </tr>
          <tr class="tr">
            <td class="td">
              Schedule Name
            </td>
            <td class="td">
              Is Active
            </td>
            <td class="td">
              Trigger Type
            </td>
            <td class="td">
              Last Run
            </td>
            <td class="td">
              Next Run
            </td>
            <td class="td">
              Error
            </td>
            <td class="td"></td>
          </tr>
          <tr class="tr" v-for="schedule in jobDefForEdit_schedules" v-bind:key="schedule.id">
            <td class="td">
              {{ schedule.name }}
            </td>
            <td class="td">
              <input type="checkbox" v-model="schedule.isActive" @change="onScheduleIsActiveChanged(schedule)" />
            </td>
            <td class="td">
              {{ schedule.TriggerType }}
            </td>
            <td class="td">
              {{ momentToStringV2(schedule.lastScheduledRunDate) }}
            </td>
            <td class="td">
              {{ momentToStringV2(schedule.nextScheduledRunDate) }}
            </td>
            <td class="td">
              {{ schedule.scheduleError }}
            </td>

            <td class="td">
              <a @click.prevent="onEditScheduleClicked(schedule)">edit</a>
              <a @click.prevent="onDeleteScheduleClicked(schedule)" style="margin-left: 10px;">delete</a>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button class="button" @click="onCreateScheduleClicked">Create Schedule</button>
            </td>
            <td colspan="5"></td>
          </tr>
        </table>
      </div>

      <div class="tabs-container-item" v-else-if="activeTab === JobTab.RUN">
        <table class="table" style="background-color: inherit;">
          <tr class="tr">
            <td class="td"></td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button
                class="button"
                @click="onPauseResumeButtonClicked"
                :class="{
                  'is-primary': jobDef.status === JobDefStatus.PAUSED,
                  'is-danger': jobDef.status === JobDefStatus.RUNNING,
                }"
              >
                <template v-if="jobDef.status === JobDefStatus.RUNNING">
                  Pause new job creation
                </template>
                <template v-else>
                  Resume new job creation
                </template>
              </button>
            </td>
            <td class="td"></td>
          </tr>
          <tr class="tr">
            <td class="td" colspan="4">
              <button class="button" @click="onSelectScriptVarsForRuntimeVarsClicked">Add Script Vars (@sgg)</button>
            </td>
          </tr>
          <tr class="tr">
            <td class="td"></td>
          </tr>
          <tr class="tr">
            <td class="td">Variables for next run</td>
          </tr>
          <tr class="tr">
            <td class="td">
              <table class="table striped-table" style="width: 720px;">
                <tr class="tr" v-for="(value, key) in runJobVars" v-bind:key="'runJobVar_' + key">
                  <td class="td">{{ key }}</td>
                  <td class="td"><span style="font-weight: 700; size: 20px;"> = </span></td>
                  <td class="td">{{ value.value }}</td>
                  <td class="td"><a @click.prevent="onDeleteRunJobVarClicked(key)">Delete</a></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <div class="is-flex is-align-items-center">
                <input
                  style="margin-left: 10px;"
                  type="checkbox"
                  v-model="newRunJobVarValue.sensitive"
                  :checked="false"
                />
                <span style="margin-left: 10px; margin-right: 20px;">Sensitive</span>

                <validation-observer ref="addRunJobVarsValidationObserver" slim v-slot="{ invalid }">
                    <validation-provider name="Variable Key" rules="required" v-slot="{ errors }">
                      <div class="is-relative is-inline-block">
                        <input
                          class="input"
                          ref="newRunJobVarKeyInput"
                          type="text"
                          style="width: 250px;"
                          v-model="newRunJobVarKey"
                          placeholder="key"
                        />
                        <span v-if="errors && errors.length > 0" class="is-absolute error-message-left message validation-error is-danger">{{
                          errors[0]
                        }}</span>
                    </div>
                  </validation-provider>

                  <span class="has-text-weight-bold mx-1" style="vertical-align: -webkit-baseline-middle;">=</span>

                  <validation-provider name="Variable Value" rules="required" v-slot="{ errors }" slim>
                    <div class="is-inline-block is-relative">
                      <ValueInput v-model="newRunJobVarValue.value"
                        :key="Object.keys(runJobVars).length"
                        class="mb-0"
                        style="width: 250px;"
                        placeholder="value" />
                      <span v-if="errors && errors.length > 0" class="is-absolute error-message-left message validation-error is-danger">{{
                        errors[0]
                      }}</span>
                    </div>
                  </validation-provider>

                  <button class="button button-spaced" :disabled="invalid" @click="onAddRunJobVarClicked">Add Runtime Variable</button>
                </validation-observer>
              </div>
            </td>
          </tr>
          <tr class="tr">
            <td class="td">
              <button class="button" @click="onRunJobClicked" :disabled="jobDef.status === JobDefStatus.PAUSED">
                Run Job
              </button>
            </td>
            <td class="td"></td>
          </tr>
          <tr class="tr">
            <td class="td">
              <router-link v-if="runJobId" :to="{ name: 'jobDetailsMonitor', params: { jobId: runJobId } }"
                >Running job</router-link
              >
            </td>
            <td class="td"></td>
          </tr>
        </table>
      </div>

      <div class="tabs-container-item" v-else-if="activeTab === JobTab.SETTINGS">
        <validation-observer ref="editJobValidationObserver">
          <table class="table" style="background-color: inherit;">
            <tr class="tr">
              <td class="td"></td>
            </tr>

            <tr class="tr">
              <td class="td">
                <label class="label">Name</label>
              </td>
              <td class="td">
                <validation-provider name="Job Name" rules="required|object-name" v-slot="{ errors }">
                  <input class="input" v-model="jobDefForEdit.name" />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label">Id</label>
              </td>
              <td class="td">
                {{ jobDef.id }}
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label">Run Count</label>
              </td>
              <td class="td">
                {{ jobDef.lastRunId }}
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label">Max Instances</label>
              </td>
              <td class="td">
                <validation-provider name="Max Instances" rules="required|positiveNumber" v-slot="{ errors }">
                  <input class="input" v-model="jobDefForEdit.maxInstances" />
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label">Misfire Grace Time</label>
              </td>
              <td class="td">
                <validation-provider name="Misfire Grace Time" rules="positiveNumber" v-slot="{ errors }">
                  <input class="input" v-model="jobDefForEdit.misfireGraceTime" /> (seconds)
                  <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                    {{ errors[0] }}
                  </div>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <label class="checkbox">
                  <input type="checkbox" v-model="jobDefForEdit.coalesce" />
                  Coalesce
                </label>
              </td>
            </tr>
            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <label class="checkbox">
                  <input type="checkbox" v-model="jobDefForEdit.pauseOnFailedJob" />
                  Pause on Failed Job
                </label>
              </td>
            </tr>

            <tr class="tr">
              <td class="td">
                <span style="font-size: 24px; margin-bottom: 12px;">
                  Team Alerts
                </span>
              </td>
              <td class="td">
                These override the Team Alert Settings
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="margin-left: 20px;">Task Interrupted</label>
              </td>
              <td class="td">
                <validation-provider name="Task Interrupted Email Address" rules="email" v-slot="{ errors }">
                  <input
                    class="input"
                    type="text"
                    style="width: 400px;"
                    v-model="jobDefForEdit.onJobTaskInterruptedAlertEmail"
                    placeholder="email@address.com"
                  />
                  <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{
                    errors[0]
                  }}</span>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="margin-left: 20px;">Task Failed</label>
              </td>
              <td class="td">
                <validation-provider name="Task Failed Email Address" rules="email" v-slot="{ errors }">
                  <input
                    class="input"
                    type="text"
                    style="width: 400px;"
                    v-model="jobDefForEdit.onJobTaskFailAlertEmail"
                    placeholder="email@address.com"
                  />
                  <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{
                    errors[0]
                  }}</span>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="margin-left: 20px;">Job Complete</label>
              </td>
              <td class="td">
                <validation-provider name="Job Complete Email Address" rules="email" v-slot="{ errors }">
                  <input
                    class="input"
                    type="text"
                    style="width: 400px;"
                    v-model="jobDefForEdit.onJobCompleteAlertEmail"
                    placeholder="email@address.com"
                  />
                  <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{
                    errors[0]
                  }}</span>
                </validation-provider>
              </td>
            </tr>

            <tr class="tr">
              <td class="td">
                <span style="font-size: 24px; margin-bottom: 12px;">
                  Slack Alerts
                </span>
              </td>
              <td class="td">
                These override the Team Alert Settings
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="margin-left: 20px;">Task Interrupted</label>
              </td>
              <td class="td">
                <validation-provider name="Task Interrupted Slack Url" rules="url" v-slot="{ errors }">
                  <input
                    class="input"
                    type="text"
                    style="width: 400px;"
                    v-model="jobDefForEdit.onJobTaskInterruptedAlertSlackURL"
                    placeholder="https://slack.com"
                  />
                  <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{
                    errors[0]
                  }}</span>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="margin-left: 20px;">Task Failed</label>
              </td>
              <td class="td">
                <validation-provider name="Task Failed Slack Url" rules="url" v-slot="{ errors }">
                  <input
                    class="input"
                    type="text"
                    style="width: 400px;"
                    v-model="jobDefForEdit.onJobTaskFailAlertSlackURL"
                    placeholder="https://slack.com"
                  />
                  <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{
                    errors[0]
                  }}</span>
                </validation-provider>
              </td>
            </tr>
            <tr class="tr">
              <td class="td">
                <label class="label" style="margin-left: 20px;">Job Complete</label>
              </td>
              <td class="td">
                <validation-provider name="Job Complete Slack Url" rules="url" v-slot="{ errors }">
                  <input
                    class="input"
                    type="text"
                    style="width: 400px;"
                    v-model="jobDefForEdit.onJobCompleteAlertSlackURL"
                    placeholder="https://slack.com"
                  />
                  <span v-if="errors && errors.length > 0" class="message validation-error is-danger">{{
                    errors[0]
                  }}</span>
                </validation-provider>
              </td>
            </tr>

            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button is-primary" :disabled="!hasJobDefChanged" @click="onSaveJobDefClicked">
                  Save
                </button>
                <button class="button button-spaced" :disabled="!hasJobDefChanged" @click="cancelJobDefChanges">
                  Cancel
                </button>
              </td>
            </tr>

            <tr class="tr">
              <td class="td"></td>
              <td class="td">
                <button class="button" @click="onCloneJobDefClicked">Clone this Job</button>
              </td>
            </tr>

            <tr class="tr">
              <td colspan="2"></td>
            </tr>
          </table>
        </validation-observer>
      </div>

      <div class="tabs-container-item" v-else-if="activeTab === JobTab.VARIABLES">
        <div>
          <table class="table mt-4" style="width: 800px; background-color: inherit;">
            <tr class="tr">
              <td class="td" colspan="4">
                <button class="button" @click="onSelectScriptVarsClicked">Add Script Vars (@sgg)</button>
              </td>
            </tr>
          </table>
          <VariableList @input="onJobDefRuntimeVarsChanged"
            :value="jobDefForEdit.runtimeVars"
            :variable="jobDefRuntimeVariable" />
        </div>
      </div>

      <div class="tabs-container-item" v-else-if="activeTab === JobTab.DESIGNER">
        <div class="task-designer">
          <div class="task-designer-nav">
            <button class="button" :disabled="selectedTaskDefTarget" @click="createNewTaskDef_chooseTarget">
              New Task
            </button>
            <button
              class="button button-spaced"
              :disabled="selectedTaskDefTarget || !selectedTaskDefForDesigner"
              @click="editTaskDef(selectedTaskDefForDesigner)"
            >
              Edit Task
            </button>
            <button
              class="button button-spaced"
              :disabled="selectedTaskDefTarget || !selectedTaskDefForDesigner"
              @click="onDeleteTaskDefClicked"
            >
              Delete Task
            </button>
            <button
              class="button button-spaced"
              :disabled="selectedTaskDefTarget || !selectedTaskDefForDesigner"
              @click="onRouteAllTasksToClicked"
            >
              Route All To {{ selectedTaskDefForDesigner && selectedTaskDefForDesigner.name }}
            </button>

            <button class="button button-spaced" :disabled="!selectedTaskDefTarget" @click="onExitRouteEditClicked">
              Exit Route Mode
            </button>

            <span
              v-if="taskDesignerMode === 'editRoutes_inbound'"
              style="margin-left: 10px; position: relative; bottom: -8px;"
              ><br />Edit direct routes to <strong>{{ selectedTaskDefTarget.name }}</strong> (ALL must finish for
              {{ selectedTaskDefTarget.name }} to run.)</span
            >
            <span
              v-if="taskDesignerMode === 'editRoutes_outbound'"
              style="margin-left: 10px; position: relative; bottom: -8px;"
              ><br />Edit direct routes from <strong>{{ selectedTaskDefTarget.name }}</strong>
            </span>
            <span v-if="taskDesignerMode === 'showRoutes'" style="margin-left: 10px; position: relative; bottom: -8px;"
              ><br />Showing all route paths to task <strong>{{ selectedTaskDefTarget.name }}</strong></span
            >
          </div>
          <div class="task-designer-body" @click="onDesignerClicked">
            <designer-task
              v-for="taskDef in taskDefs"
              v-bind:key="taskDef.id"
              @clickedBody="onTaskDefInDesignerClicked(taskDef)"
              @clickedEditInboundTasks="editInboundTasks(taskDef)"
              @clickedShowInboundPaths="showInboundPaths(taskDef)"
              @clickedEditOutboundTasks="editOutboundTasks(taskDef)"
              :taskDesignerMode="taskDesignerMode"
              :taskDefs="taskDefs"
              :source="taskDef"
              :target="selectedTaskDefTarget"
              :selected="selectedTaskDefForDesigner"
              :inboundTaskPaths="inboundTaskPaths"
              :illegalLoopTasks="illegalLoopTasks"
              :inboundHighlightPath="inboundHighlightPath"
              @setInboundHighlightPath="inboundHighlightPath = $event"
            >
            </designer-task>
          </div>
        </div>
      </div>

      <!-- Edit task -->
      <div v-else-if="activeTab === JobTab.TASK">
        <task-def-editor
          v-if="selectedTaskDefForEdit && selectedTaskDefForEdit.target !== TaskDefTarget.AWS_LAMBDA"
          @editStepDef="onEditStepDefClicked"
          @createNewStepDef="onCreateStepDefClicked"
          @deleteStepDef="onDeleteStepDefClicked"
        >
        </task-def-editor>
        <s-g-c-task-def-editor
          v-if="selectedTaskDefForEdit && selectedTaskDefForEdit.target === TaskDefTarget.AWS_LAMBDA"
        >
        </s-g-c-task-def-editor>
      </div>

      <div class="tabs-container-item" v-else-if="activeTab === JobTab.STEP">
        <!-- Edit step -->
        <div class="edit-step" style="background-color: inherit;" v-if="selectedStepDefForEdit">
          <validation-observer ref="editStepDefValidationObserver">
            <table class="table mt-4" style="width: 100%; background-color: inherit;">
              <tr class="tr">
                <td class="td" style="width: 120px;">
                  <label class="label">Step Name</label>
                </td>
                <td class="td">
                  <validation-provider name="Step Name" rules="required|object-name" v-slot="{ errors }">
                    <input class="input" style="width: 475px;" v-model="selectedStepDefForEdit.name" />
                    <div v-if="errors && errors.length > 0" class="message validation-error is-danger">
                      {{ errors[0] }}
                    </div>
                  </validation-provider>
                </td>
              </tr>
              <tr class="tr">
                <td class="td">
                  <label class="label">Arguments</label>
                </td>
                <td class="td">
                  <input class="control input" style="width: 475px;" v-model="selectedStepDefForEdit.arguments" />
                </td>
              </tr>
              <tr class="tr">
                <td class="td">
                  <label class="label">Variables</label>
                </td>
                <td class="td">
                  <div class="select is-multiple">
                    <select
                      multiple
                      size="5"
                      style="width: 475px; margin-bottom: 10px;"
                      v-model="selectedStepDefVariables"
                    >
                      <option v-for="(value, key) in selectedStepDefForEdit.variables" v-bind:key="key" :value="key">{{
                        `${key}=${value}`
                      }}</option>
                    </select>
                  </div>
                  <br />
                  <button class="button" @click="onCreateNewStepDefVariableClicked">Create variable</button>
                  <button
                    class="button button-spaced"
                    :disabled="!selectedStepDefVariable"
                    @click="onDeleteStepDefVariableClicked"
                  >
                    Delete variable
                  </button>
                </td>
              </tr>
              <tr class="tr">
                <td class="td">
                  <label class="label">Script</label>
                </td>
                <td class="td">
                  <script-search-with-create
                    :scriptId="selectedStepDefForEdit._scriptId"
                    @scriptPicked="onScriptPicked"
                  ></script-search-with-create>
                </td>
              </tr>
              <tr class="tr">
                <td class="td"></td>
                <td class="td">
                  <button class="button is-primary" :disabled="!hasStepDefChanged" @click="onSaveStepDefClicked">
                    Save
                  </button>
                  <button class="button button-spaced" :disabled="!hasStepDefChanged" @click="cancelStepDefChanges">
                    Cancel
                  </button>
                </td>
              </tr>
              <tr class="tr">
                <td class="td" colspan="3">
                  <script-editor :script="selectedScript" :jobDef="jobDef"></script-editor>
                </td>
              </tr>
            </table>
          </validation-observer>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { momentToStringV1, momentToStringV2, timeZones } from "../utils/DateTime";
import axios from "axios";
import _ from "lodash";
import DesignerTask from "../components/DesignerTask.vue";
import { StoreType } from "../store/types";
import { JobDef, JobDefStatus } from "../store/jobDef/types";
import { TaskDef, TaskDefTarget } from "../store/taskDef/types";
import { StepDef } from "../store/stepDef/types";
import { Script, ScriptType } from "../store/script/types";
import { BindStoreModel, BindSelected, BindSelectedCopy, BindProp } from "../decorator";
import { JobStatus, enumKeyToPretty, enumKeys } from "../utils/Enums";
import { SgAlert, AlertPlacement, AlertCategory } from "../store/alert/types";
import { ValidationProvider, ValidationObserver } from "vee-validate";
import { focusElement } from "../utils/Shared";
import AgentSearch from "../components/AgentSearch.vue";
import { Tabs, Tab } from "vue-slim-tabs";
import { Schedule, ScheduleTriggerType } from "../store/schedule/types";
import ArtifactSearch from "../components/ArtifactSearch.vue";
import ScriptEditor from "../components/ScriptEditor.vue";
import {
  computeDownstreamTasks_inbound,
  computeUpstreamTasks_outbound,
  InboundPaths,
  computeInboundPaths,
} from "../utils/TaskRoutes";
import { ClickOutside } from "../directive";
import { showErrors } from "../utils/ErrorHandler";
import ScriptSearchWithCreate from "../components/ScriptSearchWithCreate.vue";
import TaskDefEditor from "../components/TaskDefEditor.vue";
import SGCTaskDefEditor from "../components/SGCTaskDefEditor.vue";
import ValueInput from '@/components/runtimeVariable/ValueInput.vue';
import { VariableList } from '@/components/runtimeVariable';
import { ValueFormat, Variable, VariableMap } from '@/components/runtimeVariable/types';
import ModalCard from '@/components/core/ModalCard.vue';

enum JobTab {
  VARIABLES = "RuntimeVariables",
  DESIGNER = "WorkflowDesigner",
  SCHEDULES = "Schedules",
  SETTINGS = "Settings",
  STEP = "Step",
  TASK = "Task",
  RUN = "Run",
}

@Component({
  components: {
    Tabs,
    Tab,
    AgentSearch,
    DesignerTask,
    ScriptSearchWithCreate,
    ScriptEditor,
    TaskDefEditor,
    SGCTaskDefEditor,
    ValidationProvider,
    ValidationObserver,
    ArtifactSearch,
    ValueInput,
    VariableList,
    ModalCard,
  },
  directives: { ClickOutside },
})
export default class JobDesigner extends Vue {
  // Expose to template
  private readonly momentToStringV1 = momentToStringV1;
  private readonly momentToStringV2 = momentToStringV2;
  private readonly JobStatus = JobStatus;
  private readonly TaskDefTarget = TaskDefTarget;
  private readonly enumKeyToPretty = enumKeyToPretty;
  private readonly enumKeys = enumKeys;
  private readonly ScheduleTriggerType = ScheduleTriggerType;
  private readonly JobDefStatus = JobDefStatus;
  private readonly timeZones = timeZones;
  private readonly JobTab = JobTab;

  @BindProp({ storeType: StoreType.TeamStore, selectedModelName: "selected", propName: "id" })
  private selectedTeamId: string;

  private newTaskName = "";
  private newTaskTarget = TaskDefTarget.SINGLE_AGENT;

  private newStepName = "";
  private activeTab: JobTab = JobTab.DESIGNER;
  private taskSearchTerm: string = "";

  private get runTabTitle() {
    if (this.jobDef.status === JobDefStatus.PAUSED) {
      return "Run [PAUSED]";
    } else {
      return "Run";
    }
  }

  private isAWSLambdaTaskDefType(target: TaskDefTarget) {
    return target === TaskDefTarget.AWS_LAMBDA;
  }

  @BindSelected({ storeType: StoreType.JobDefStore })
  private jobDef!: JobDef;

  @BindSelectedCopy({ storeType: StoreType.JobDefStore })
  private jobDefForEdit!: JobDef;

  private taskDesignerMode = "normal";

  private selectedItemForNav: null | JobDef | TaskDef | StepDef = null;

  private selectedTaskDefForDesigner: null | TaskDef = null;
  private selectedTaskDefSource: null | TaskDef = null;
  private selectedTaskDefTarget: null | TaskDef = null;
  private inboundTaskPaths: InboundPaths = null;
  private illegalLoopTasks: null | TaskDef[] = null;
  private inboundHighlightPath: any = null;
  private jobDefRuntimeVariable: Variable = null;

  @BindStoreModel({ storeType: StoreType.TaskDefStore })
  private selectedTaskDef!: null | TaskDef;

  @BindSelectedCopy({ storeType: StoreType.TaskDefStore })
  private selectedTaskDefForEdit!: null | TaskDef;

  private selectedStepDefVariables: any[] = [];
  private selectedStepDefVariable: any = null;

  @BindStoreModel({ storeType: StoreType.StepDefStore })
  private selectedStepDef!: null | StepDef;

  @BindSelectedCopy({ storeType: StoreType.StepDefStore })
  private selectedStepDefForEdit!: null | StepDef;

  @BindSelected({ storeType: StoreType.ScriptStore })
  private selectedScript!: null | Script;

  private mounted() {
    // Clear out any previous choices from previous designers
    this.selectedStepDef = null;
    this.selectedScript = null;
    this.selectedTaskDef = null;

    // By default the job is selected
    if (this.jobDefForEdit) {
      this.selectedItemForNav = this.jobDefForEdit;
    }

    if (localStorage.getItem("jobDesigner_navPanelWidth")) {
      const panelWidth = Number.parseInt(localStorage.getItem("jobDesigner_navPanelWidth"));
      if (!isNaN(panelWidth)) {
        this.navPanelWidth = panelWidth;
      }
    }

    this.onJobDefForEditChanged();

    // Change the stupid styling of the stupid vue-slim-tabs crap
    let stylingCheckCount = 0;
    const stylingCheckInterval = setInterval(() => {
      const tabListEl = document.getElementsByClassName("vue-tablist")[0];

      if (tabListEl) {
        (<HTMLElement>tabListEl).style.borderBottomStyle = "none";
        (<HTMLElement>tabListEl).style.backgroundColor = "pink";
      }

      if (tabListEl || stylingCheckCount++ > 10) {
        clearInterval(stylingCheckInterval);
      }
    }, 25);

    this.onTabSelected();
  }

  private onTabSelected() {
    // Change the stupid styling of the stupid vue-slim-tabs crap
    let stylingCheckCount = 0;
    const stylingCheckInterval = setInterval(() => {
      let foundStuff = false;

      if (document.querySelector("[role=tab][aria-selected=true]")) {
        (<any>document.querySelector("[role=tab][aria-selected=true]")).style.backgroundColor = "whitesmoke";
        (<any>document.querySelector("[role=tab][aria-selected=true]")).style.fontWeight = "bold";
        foundStuff = true;
      }

      const notSelected = document.querySelectorAll("[role=tab][aria-selected=false]");
      if (notSelected && notSelected.length > 0) {
        notSelected.forEach((el: any) => {
          el.style.backgroundColor = "pink";
          el.style.fontWeight = "";
        });
      }

      if (foundStuff || stylingCheckCount++ > 10) {
        clearInterval(stylingCheckInterval);
      }
    }, 25);
  }

  private beforeDestroy() {
    localStorage.setItem("jobDesigner_navPanelWidth", "" + this.navPanelWidth);
  }

  private get filteredTaskDefs(): TaskDef[] {
    return this.taskDefs.filter((task) => task.name.toLowerCase().includes(this.taskSearchTerm.toLowerCase()));
  }

  private get taskDefs(): TaskDef[] {
    return this.$store.getters[`${StoreType.TaskDefStore}/getByJobDefId`](this.jobDefForEdit.id);
  }

  private get stepDefsCache(): Record<string, StepDef[]> {
    const steps: Record<string, StepDef[]> = {};

    this.taskDefs.forEach((task) => {
      steps[task.id] = this.$store.getters[`${StoreType.StepDefStore}/getByTaskDefId`](task.id);
    });

    return steps;
  }

  private highlightTaskName(name: string): string {
    return name.replaceAll(new RegExp(this.taskSearchTerm, "ig"), "<b>$&</b>");
  }

  private selectItemForNav(selectedItem: null | TaskDef | StepDef) {
    this.selectedItemForNav = selectedItem;
    this.selectedTaskDefForDesigner = null;

    if (selectedItem) {
      switch (selectedItem.type) {
        case "JobDef":
          this.selectedTaskDef = null;
          this.selectedStepDef = null;
          this.activeTab = JobTab.DESIGNER;
          break;

        case "TaskDef":
          this.selectedStepDef = null;
          if (selectedItem.target === undefined) {
            selectedItem.target = TaskDefTarget.ALL_AGENTS;
          }

          this.selectedTaskDef = <TaskDef>selectedItem;
          this.activeTab = JobTab.TASK;
          break;

        case "StepDef":
          this.selectedTaskDef = null;
          this.selectedStepDef = <StepDef>selectedItem;
          this.activeTab = JobTab.STEP;
          break;
      }
    }
  }

  private onDesignerClicked() {
    if (!this.selectedTaskDefTarget) {
      this.selectedTaskDefForDesigner = null;
      this.selectedTaskDefTarget = null;
    }
  }

  private onTaskDefInDesignerClicked(taskDef: TaskDef) {
    if (!this.selectedTaskDefTarget) {
      this.selectedTaskDefForDesigner = taskDef;
    }
  }

  private editTaskDef(selectedTaskDef: TaskDef) {
    this.selectItemForNav(selectedTaskDef);
  }

  private editInboundTasks(selectedTaskDef: TaskDef) {
    this.illegalLoopTasks = computeDownstreamTasks_inbound(this.taskDefs, selectedTaskDef);

    this.taskDesignerMode = "editRoutes_inbound";
    this.selectedTaskDefTarget = selectedTaskDef;
    this.selectedTaskDefForDesigner = selectedTaskDef;
  }

  private editOutboundTasks(selectedTaskDef: TaskDef) {
    this.illegalLoopTasks = computeUpstreamTasks_outbound(this.taskDefs, selectedTaskDef);

    this.taskDesignerMode = "editRoutes_outbound";
    this.selectedTaskDefTarget = selectedTaskDef;
    this.selectedTaskDefForDesigner = selectedTaskDef;
  }

  private showInboundPaths(selectedTaskDef: TaskDef) {
    this.inboundTaskPaths = computeInboundPaths(this.taskDefs, selectedTaskDef);

    this.taskDesignerMode = "showRoutes";
    this.selectedTaskDefTarget = selectedTaskDef;
    this.selectedTaskDefForDesigner = selectedTaskDef;
  }

  private get hasJobDefChanged() {
    return this.$store.state[StoreType.JobDefStore].storeUtils.hasSelectedCopyChanged();
  }

  private cancelJobDefChanges() {
    // Just reselect the original job def
    this.$store.dispatch(`${StoreType.JobDefStore}/select`, this.jobDef);
  }

  private async onSaveJobDefClicked() {
    try {
      if (!(await (<any>this.$refs.editJobValidationObserver).validate())) {
        return;
      }

      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert(`Saving job - ${this.jobDefForEdit.name}`, AlertPlacement.FOOTER)
      );
      await this.$store.dispatch(`${StoreType.JobDefStore}/save`);
    } catch (err) {
      console.error(err);
      showErrors("Error saving job", err);
    }
  }

  private createNewTaskDef_chooseTarget() {
    this.$modal.show("create-taskdef-modal-choose-target");
  }

  private cancelCreateNewTaskDef_chooseTarget() {
    this.$modal.hide("create-taskdef-modal-choose-target");
  }

  private createNewTaskDef() {
    this.cancelCreateNewTaskDef_chooseTarget();
    this.newTaskName = ""; // reset
    this.newTaskTarget = TaskDefTarget.SINGLE_AGENT;
    this.$modal.show("create-taskdef-modal");
    focusElement("create-taskdef-modal-autofocus");
  }

  private taskDefToDelete: TaskDef | null = null;

  private onDeleteTaskDefClicked() {
    if (this.selectedTaskDefForDesigner) {
      this.taskDefToDelete = this.selectedTaskDefForDesigner;
      this.$modal.show("delete-taskdef-modal");
    }
  }

  private createNewAWSLambdaTaskDef() {
    this.cancelCreateNewTaskDef_chooseTarget();
    this.newTaskName = ""; // reset
    this.newTaskTarget = TaskDefTarget.AWS_LAMBDA;
    this.$modal.show("create-taskdef-modal");
    focusElement("create-taskdef-modal-autofocus");
  }

  private onExitRouteEditClicked() {
    this.taskDesignerMode = "normal";
    this.selectedTaskDefTarget = null;
  }

  private async deleteTaskDef() {
    try {
      if (this.taskDefToDelete) {
        this.$modal.hide("delete-taskdef-modal");

        await this.$store.dispatch(`${StoreType.TaskDefStore}/delete`, this.taskDefToDelete);
        this.$store.dispatch(
          `${StoreType.AlertStore}/addAlert`,
          new SgAlert(`Deleted task - ${this.taskDefToDelete.name}`, AlertPlacement.FOOTER)
        );
        this.selectedTaskDefForDesigner = null;
      }
    } catch (err) {
      console.error(err);
      showErrors("Error deleting task", err);
    } finally {
      this.taskDefToDelete = null;
    }
  }

  private cancelDeleteTaskDef() {
    this.taskDefToDelete = null;
    this.$modal.hide("delete-taskdef-modal");
  }

  private cancelCreateNewTaskDef() {
    this.$modal.hide("create-taskdef-modal");
    this.cancelCreateNewTaskDef_chooseTarget();
  }

  private async saveNewTaskDef() {
    if (!(await (<any>this.$refs.newTaskValidationObserver).validate())) {
      return;
    }

    try {
      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert(`Creating task - ${this.newTaskName}`, AlertPlacement.FOOTER)
      );

      const newTask: TaskDef = {
        _jobDefId: this.jobDefForEdit.id,
        target: this.newTaskTarget,
        name: this.newTaskName,
        requiredTags: {},
        fromRoutes: [],
        toRoutes: [],
        artifacts: [],
      };

      const createdTask = await this.$store.dispatch(`${StoreType.TaskDefStore}/save`, newTask);

      if (this.isAWSLambdaTaskDefType(this.newTaskTarget)) {
        // Load the step def immediately and wait on this - if anyone views the steps, they are supposed to be in the store right away
        await this.$store.dispatch(`${StoreType.StepDefStore}/fetchModelsByFilter`, {
          filter: `_taskDefId==${createdTask.id}`,
        });
      }
    } catch (err) {
      console.error(err);
      showErrors("Error creating task", err);
    } finally {
      this.$modal.hide("create-taskdef-modal");
    }
  }

  private createNewStepDef() {
    this.newStepName = "";
    this.$modal.show("create-stepdef-modal");
    focusElement("create-stepdef-modal-autofocus");
  }

  private cancelCreateNewStepDef() {
    this.$modal.hide("create-stepdef-modal");
  }

  private async saveNewStepDef() {
    if (!(await (<any>this.$refs.newStepValidationObserver).validate())) {
      return;
    }
    if (!this.selectedTaskDef) {
      throw "The selected task def was not set";
    }

    try {
      const stepDefs = this.stepDefsCache[this.selectedTaskDef.id];

      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert(`Creating step - ${this.newStepName}`, AlertPlacement.FOOTER)
      );
      const newStep: StepDef = {
        _taskDefId: <string>this.selectedTaskDef.id,
        name: this.newStepName,
        order: stepDefs.length + 1,
        arguments: "",
        variables: {},
        requiredTags: {},
        script: { _id: "" },
      };

      await this.$store.dispatch(`${StoreType.StepDefStore}/save`, newStep);
    } catch (err) {
      console.error(err);
      showErrors("Error creating step", err);
    } finally {
      this.$modal.hide("create-stepdef-modal");
    }
  }

  // Called from task def editor
  private onEditStepDefClicked(stepDef: StepDef) {
    this.selectedTaskDef = null;
    this.selectedStepDef = stepDef;
  }

  // Called from task def editor
  private onCreateStepDefClicked() {
    this.createNewStepDef();
  }

  private stepDefToDelete: StepDef | null = null;

  // Called from task def editor
  private onDeleteStepDefClicked(stepDef: StepDef) {
    this.stepDefToDelete = stepDef;
    this.$modal.show("delete-stepdef-modal");
  }

  private async deleteStepDef() {
    try {
      this.$modal.hide("delete-stepdef-modal");
      if (this.stepDefToDelete) {
        await this.$store.dispatch(`${StoreType.StepDefStore}/delete`, this.stepDefToDelete);
        this.$store.dispatch(
          `${StoreType.AlertStore}/addAlert`,
          new SgAlert(`Deleted step - ${this.stepDefToDelete.name}`, AlertPlacement.FOOTER)
        );
      }
    } catch (err) {
      console.error(err);
      showErrors("Error deleting step", err);
    } finally {
      this.stepDefToDelete = null;
    }
  }

  private cancelDeleteStepDef() {
    this.stepDefToDelete = null;
    this.$modal.hide("delete-stepdef-modal");
  }

  private get hasStepDefChanged() {
    return this.$store.state[StoreType.StepDefStore].storeUtils.hasSelectedCopyChanged();
  }

  @Watch("selectedStepDefForEdit")
  private async onSelectedStepDefForEditChanged() {
    if (this.selectedStepDefForEdit && this.selectedStepDefForEdit._scriptId) {
      this.selectedScript = await this.$store.dispatch(
        `${StoreType.ScriptStore}/fetchModel`,
        this.selectedStepDefForEdit._scriptId
      );
    } else {
      this.selectedScript = null;
    }
  }

  @Watch("selectedStepDefVariables")
  private onSelectedStepDefVariablesChanged() {
    if (this.selectedStepDefVariables.length === 1) {
      this.selectedStepDefVariable = this.selectedStepDefVariables[0];
    } else {
      this.selectedStepDefVariable = null;
    }
  }

  private onCreateNewStepDefVariableClicked() {
    if (this.selectedStepDefForEdit) {
      this.$modal.show("create-stepdefvariable-modal");
      focusElement("create-stepdefvariable-modal-autofocus");
    }
  }

  private onDeleteStepDefVariableClicked() {
    if (this.selectedStepDefForEdit && this.selectedStepDefVariable) {
      // Need to create a new object for vue reactivity
      const newVariables = _.cloneDeep(this.selectedStepDefForEdit.variables);
      delete newVariables[this.selectedStepDefVariable];
      this.selectedStepDefForEdit.variables = newVariables;
    }
  }

  private newVariableKey: null | string = null;
  private newVariableValue: null | string = null;

  private async createNewStepDefVariable() {
    if (!this.selectedStepDefForEdit || !(await (<any>this.$refs.newStepDefVariableValidationObserver).validate())) {
      return;
    }

    try {
      // Need to create a new object for vue reactivity
      const newVariables = _.cloneDeep(this.selectedStepDefForEdit.variables);
      newVariables[<any>this.newVariableKey] = this.newVariableValue;
      this.selectedStepDefForEdit.variables = newVariables;
    } finally {
      this.$modal.hide("create-stepdefvariable-modal");
    }
  }

  private cancelCreateNewStepDefVariable() {
    this.$modal.hide("create-stepdefvariable-modal");
  }

  private cancelStepDefChanges() {
    // Just reselect the original job def
    this.$store.dispatch(`${StoreType.StepDefStore}/select`, this.selectedStepDef);
  }

  private async onSaveStepDefClicked() {
    try {
      if (this.selectedStepDefForEdit) {
        if (!(await (<any>this.$refs.editStepDefValidationObserver).validate())) {
          return;
        }

        this.$store.dispatch(
          `${StoreType.AlertStore}/addAlert`,
          new SgAlert(`Saving step - ${this.selectedStepDefForEdit.name}`, AlertPlacement.FOOTER)
        );
        await this.$store.dispatch(`${StoreType.StepDefStore}/save`);
      }
    } catch (err) {
      console.error(err);
      showErrors("Error saving step", err);
    }
  }

  private newScriptType: ScriptType = ScriptType.NODE;

  private onScriptPicked(script: Script) {
    if (script) {
      this.selectedStepDefForEdit._scriptId = script.id;
    } else {
      this.selectedStepDefForEdit._scriptId = null;
    }

    // Changing the ._scriptId property isn't reactive but just trigger it manually
    this.onSelectedStepDefForEditChanged();
  }

  private async onJobDefRuntimeVarsChanged(runtimeVars: VariableMap) {
    this.jobDefForEdit.runtimeVars = runtimeVars;

    try {
      await this.$store.dispatch(`${StoreType.JobDefStore}/save`, {
        id: this.jobDefForEdit.id,
        runtimeVars,
      });

      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Saved job`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors("Error saving the job runtime variables", err);
    }
  }

  private get jobDefForEdit_schedules(): Schedule[] {
    if (this.jobDefForEdit) {
      return this.getSchedulesForJobDef(this.jobDefForEdit);
    } else {
      return [];
    }
  }

  private getSchedulesForJobDef(jobDef: JobDef): Schedule[] {
    this.$store.dispatch(`${StoreType.ScheduleStore}/fetchModelsByFilter`, { filter: `_jobDefId==${jobDef.id}` });

    // Trigger the filter and the getters will be reactive as the data loads
    return this.$store.getters[`${StoreType.ScheduleStore}/getByJobDefId`](jobDef.id);
  }

  private editSchedule: Schedule = <any>{ TriggerType: ScheduleTriggerType.date };
  private editSchedule_cron: any = {};
  private editSchedule_interval = {};
  private scheduleToDelete: Schedule | null = null;

  private onCreateScheduleClicked() {
    this.editSchedule = <any>{ TriggerType: ScheduleTriggerType.date };
    this.editSchedule_cron = {};
    this.editSchedule_interval = {};

    // Try to set the default timezone
    try {
      const computerTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZones.findIndex((zone) => zone.value === computerTZ) === -1) {
        console.log("Unable to recognize computers timezone", computerTZ);
      } else {
        this.editSchedule_cron.Timezone = computerTZ;
      }
    } catch (err) {
      console.error("Unable to compute computers timezone");
    }

    // select schedule type by default
    this.editSchedule.TriggerType = ScheduleTriggerType.date;

    this.$modal.show("edit-schedule-modal");
  }

  private onEditScheduleClicked(schedule: Schedule) {
    this.editSchedule = <any>{
      id: schedule.id,
      runtimeVars: schedule.FunctionKwargs.runtimeVars,
      TriggerType: schedule.TriggerType,
      name: schedule.name,
      isActive: schedule.isActive,
    };

    if (schedule.TriggerType === ScheduleTriggerType.date) {
      const offset = new Date().getTimezoneOffset() * 1000 * 60;
      const offsetDate = new Date(schedule.RunDate).valueOf() - offset;

      Object.assign(this.editSchedule, {
        RunDate: new Date(offsetDate).toISOString().substring(0, 16),
      });
    }

    this.editSchedule_cron = _.clone(schedule.cron);
    this.editSchedule_interval = _.clone(schedule.interval);

    this.$modal.show("edit-schedule-modal");
  }

  private async onCreateSchedule() {
    if (this.jobDefForEdit) {
      if (!(await (<any>this.$refs.editScheduleValidationObserver).validate())) {
        return;
      }

      try {
        // todo - possibly conditional validation based on Schedule.TriggerType
        this.$store.dispatch(
          `${StoreType.AlertStore}/addAlert`,
          new SgAlert(`Saving schedule - ${this.editSchedule.name}`, AlertPlacement.FOOTER)
        );

        const scheduleToSave: any = _.clone(this.editSchedule);
        scheduleToSave["_jobDefId"] = this.jobDefForEdit.id;
        scheduleToSave["FunctionKwargs"] = {
          _teamId: this.selectedTeamId,
          targetId: this.jobDefForEdit.id,
          runtimeVars: this.editSchedule.runtimeVars,
        };

        if (this.editSchedule.TriggerType === ScheduleTriggerType.date) {
          scheduleToSave["RunDate"] = this.editSchedule.RunDate;
          // Need to convert the date that the user entered into ISO format for the server to accept
          scheduleToSave["RunDate"] = new Date(scheduleToSave["RunDate"]).toISOString();
        } else if (this.editSchedule.TriggerType === ScheduleTriggerType.cron) {
          scheduleToSave["cron"] = _.clone(this.editSchedule_cron);
        } else if (this.editSchedule.TriggerType === ScheduleTriggerType.interval) {
          scheduleToSave["interval"] = _.clone(this.editSchedule_interval);
        }

        await this.$store.dispatch(`${StoreType.ScheduleStore}/save`, scheduleToSave);
      } catch (err) {
        console.error(err);
        showErrors("Error saving schedule", err);
      } finally {
        this.$modal.hide("edit-schedule-modal");
      }
    }
  }

  private onCancelCreateSchedule() {
    this.$modal.hide("edit-schedule-modal");
  }

  private onDeleteScheduleClicked(schedule: Schedule) {
    this.scheduleToDelete = schedule;
    this.$modal.show("delete-schedule-modal");
    focusElement("artifactsearch-modal-autofocus");
  }

  private async deleteSchedule() {
    try {
      await this.$store.dispatch(`${StoreType.ScheduleStore}/delete`, this.scheduleToDelete);
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Schedule deleted`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors("Error deleting the schedule", err);
    } finally {
      this.$modal.hide("delete-schedule-modal");
      this.scheduleToDelete = null;
    }
  }

  private cancelDeleteSchedule() {
    this.$modal.hide("delete-schedule-modal");
    this.scheduleToDelete = null;
  }

  private async onScheduleIsActiveChanged(schedule: Schedule) {
    try {
      await this.$store.dispatch(`${StoreType.ScheduleStore}/save`, { id: schedule.id, isActive: schedule.isActive });
      this.$store.dispatch(`${StoreType.AlertStore}/addAlert`, new SgAlert(`Schedule saved`, AlertPlacement.FOOTER));
    } catch (err) {
      console.error(err);
      showErrors("Error deleting the schedule", err);
    }
  }

  private async onPauseResumeButtonClicked() {
    try {
      if (this.jobDefForEdit) {
        if (this.jobDef.status === JobDefStatus.RUNNING) {
          this.jobDefForEdit.status = JobDefStatus.PAUSED;
        } else {
          this.jobDefForEdit.status = JobDefStatus.RUNNING;
        }

        await this.$store.dispatch(`${StoreType.JobDefStore}/save`);
        this.$store.dispatch(
          `${StoreType.AlertStore}/addAlert`,
          new SgAlert("Updated job status", AlertPlacement.FOOTER, AlertCategory.INFO)
        );
      }
    } catch (err) {
      console.error(err);
      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert("Error updating job status", AlertPlacement.WINDOW, AlertCategory.ERROR)
      );
    }
  }

  private outboundRouteKey = "";

  private onRouteAllTasksToClicked() {
    if (this.selectedTaskDefForDesigner) {
      this.outboundRouteKey = "";
      this.$modal.show("route-all-to-taskdef-modal");
    }
  }

  private async createOutboundRoutes() {
    try {
      if (
        this.selectedTaskDefForDesigner &&
        (await (<any>this).$refs.routeAllToTaskDefRouteValidationObserver.validate())
      ) {
        const savePromises = [];
        const targetTaskDef = this.selectedTaskDefForDesigner;

        for (let taskDef of this.taskDefs) {
          if (taskDef !== targetTaskDef) {
            const existingRouteIndex = taskDef.toRoutes.findIndex((route: string[]) => route[0] === targetTaskDef.name);

            if (existingRouteIndex === -1) {
              taskDef.toRoutes.push([targetTaskDef.name, this.outboundRouteKey]);
            } else {
              // Just overwrite the old entry
              taskDef.toRoutes[existingRouteIndex] = [targetTaskDef.name, this.outboundRouteKey];
            }

            const savePromise = this.$store.dispatch(`${StoreType.TaskDefStore}/save`, {
              id: taskDef.id,
              toRoutes: taskDef.toRoutes,
            });

            savePromises.push(savePromise);
          }
        }

        await Promise.all(savePromises);

        if (savePromises.length > 0) {
          this.$store.dispatch(
            `${StoreType.AlertStore}/addAlert`,
            new SgAlert(
              `Added out bound routes for all tasks to ${targetTaskDef.name}`,
              AlertPlacement.FOOTER,
              AlertCategory.INFO
            )
          );
        }

        this.$modal.hide("route-all-to-taskdef-modal");
      }
    } catch (err) {
      console.error(err);
      this.$store.dispatch(
        `${StoreType.AlertStore}/addAlert`,
        new SgAlert("Error creating routes", AlertPlacement.WINDOW, AlertCategory.ERROR)
      );
    }
  }

  private cancelCreateOutboundRoutes() {
    this.$modal.hide("route-all-to-taskdef-modal");
  }

  private runJobVars: { [key: string]: {} } = {};
  private newRunJobVarKey = "";
  private newRunJobVarValue = { value: "", sensitive: false };
  private runJobId = null;

  @Watch("jobDefForEdit")
  private onJobDefForEditChanged() {
    if (this.jobDefForEdit) {
      const localStorageKey = `jobDesigner_runJobVars_${this.jobDefForEdit.id}`;
      if (localStorage.getItem(localStorageKey)) {
        try {
          this.runJobVars = JSON.parse(localStorage.getItem(localStorageKey));
        } catch (err) {
          console.warn("Unable to restore ", localStorageKey);
          localStorage.removeItem(localStorageKey);
          this.runJobVars = {};
        }
      }
    }
  }

  @Watch("runJobVars")
  private onRunJobVarsChanged() {
    if (this.jobDefForEdit) {
      localStorage.setItem(`jobDesigner_runJobVars_${this.jobDefForEdit.id}`, JSON.stringify(this.runJobVars));
    }
  }

  private async onAddRunJobVarClicked() {
    if (await (<any>this).$refs.addRunJobVarsValidationObserver.validate()) {
      const runJobVarsClone = _.clone(this.runJobVars);
      runJobVarsClone[this.newRunJobVarKey] = this.newRunJobVarValue;
      this.runJobVars = runJobVarsClone;
      this.newRunJobVarKey = "";
      this.newRunJobVarValue = { value: "", sensitive: false };
      (<any>this).$refs.addRunJobVarsValidationObserver.reset();
    }
  }

  private onDeleteRunJobVarClicked(key) {
    const runJobVarsClone = _.clone(this.runJobVars);
    delete runJobVarsClone[key];
    this.runJobVars = runJobVarsClone;
  }

  private async onRunJobClicked() {
    try {
      this.runJobId = null;

      let rtVars = {};
      let keys = Object.keys(this.runJobVars);
      for (let i = 0; i < keys.length; ++i) {
        let key = keys[i];
        const val: any = this.runJobVars[key];
        if (key.startsWith("<<") && key.endsWith(">>")) {
          key = key.substring(2, key.length - 2);
          rtVars[key] = {};
          rtVars[key]["value"] = val.value;
          rtVars[key]["sensitive"] = true;
        } else {
          rtVars[key] = {};
          rtVars[key]["value"] = val.value;
          rtVars[key]["sensitive"] = false;
        }
      }

      const {
        data: { data },
      } = await axios.post(
        `/api/v0/job`,
        {
          runtimeVars: rtVars,
        },
        { headers: { _jobDefId: this.jobDef.id } }
      );

      this.runJobId = data.id;
    } catch (err) {
      console.error(err);
      showErrors(`Error running job ${this.jobDef.name}`, err);
    }
  }

  private showCreateItemMenu = false;

  private onClickedCreateItemFromNav() {
    this.showCreateItemMenu = !this.showCreateItemMenu;
  }

  private onClickedOutsideNavCreateMenu() {
    this.showCreateItemMenu = false;
  }

  private onNavMenuCreateTaskClicked() {
    this.showCreateItemMenu = false;
    this.createNewTaskDef();
  }

  private onNavMenuCreateAWSLambdaTaskClicked() {
    this.showCreateItemMenu = false;
    this.createNewAWSLambdaTaskDef();
  }

  private onNavMenuCreateStepClicked() {
    this.showCreateItemMenu = false;
    this.createNewStepDef();
  }

  private onNavMenuDeleteClicked() {
    if (this.selectedTaskDefForEdit) {
      this.taskDefToDelete = this.selectedTaskDefForEdit;
      this.$modal.show("delete-taskdef-modal");
    } else if (this.selectedStepDefForEdit) {
      this.stepDefToDelete = this.selectedStepDefForEdit;
      this.$modal.show("delete-stepdef-modal");
    }
  }

  private async onCloneJobDefClicked() {
    if (this.jobDefForEdit) {
      try {
        this.$store.dispatch(
          `${StoreType.AlertStore}/addAlert`,
          new SgAlert(`Cloning job - ${this.jobDefForEdit.name}`, AlertPlacement.FOOTER)
        );

        const {
          data: { data },
        } = await axios.post(`/api/v0/jobdef/copy/`, { _jobDefId: this.jobDefForEdit.id });
        const routeData = this.$router.resolve({ name: "jobDesigner", params: { jobId: data.id } });
        window.open(routeData.href, "_blank");
      } catch (err) {
        console.error(err);
        showErrors("Error saving job", err);
      }
    }
  }

  private navResizing = false;
  private onResizerMouseDown() {
    this.navResizing = true;
  }

  private navPanelWidth = 300;

  private get editPanelMarginLeft(): number {
    const dividerOffset = 5;

    return this.navPanelWidth + 1 + dividerOffset;
  }

  private get maxNavPanelJobNameLength(): number {
    return Math.floor(this.navPanelWidth / 10.5);
  }

  private get maxNavPanelTaskNameLength(): number {
    return Math.floor(this.navPanelWidth / 9);
  }

  private get maxNavPanelStepNameLength(): number {
    return Math.floor(this.navPanelWidth / 9.5);
  }

  private onMouseMove(event: MouseEvent) {
    if (this.navResizing) {
      const navPanel = <HTMLElement>this.$refs.navPanel;

      const newNavPanelWidth = event.pageX - navPanel.getBoundingClientRect().left;
      if (newNavPanelWidth > 200 && newNavPanelWidth < 400) {
        this.navPanelWidth = newNavPanelWidth;
      }
    }
  }

  private onMouseUp() {
    this.navResizing = false;
  }

  private scriptSggs: string[] = [];
  private scriptsBySggs: { [sggName: string]: string[] } = {};

  private async calculateScriptSggs() {
    const bySggs = {};
    const sggs = [];

    if (this.taskDefs) {
      const fetchScriptPromises = [];

      for (let taskDef of this.taskDefs) {
        for (let stepDef of this.stepDefsCache[taskDef.id]) {
          fetchScriptPromises.push(this.$store.dispatch(`${StoreType.ScriptStore}/fetchModel`, stepDef._scriptId));
        }
      }

      // wait until all the promises are done
      const scripts: Script[] = await Promise.all(fetchScriptPromises);

      // now gather the sggs per script
      scripts.map((script: Script) => {
        script.sggElems.map((sgg: string) => {
          if (!bySggs[sgg]) {
            bySggs[sgg] = [];
          }

          if (bySggs[sgg].indexOf(script.name) === -1) {
            bySggs[sgg].push(script.name);
          }

          if (sggs.indexOf(sgg) === -1) {
            sggs.push(sgg);
          }
        });
      });
    }

    this.scriptsBySggs = bySggs;
    this.scriptSggs = sggs.sort();
  }

  private selectScriptsType = "";

  private onSelectScriptVarsClicked() {
    this.calculateScriptSggs();
    this.selectScriptsType = "runtime-vars";
    this.$modal.show("select-script-vars-modal");
  }

  private onSelectScriptVarsForRuntimeVarsClicked() {
    this.calculateScriptSggs();
    this.selectScriptsType = "runjobs-vars";
    this.$modal.show("select-script-vars-modal");
  }

  private onClickedAddSggAsVar(key: string) {
    this.$modal.hide("select-script-vars-modal");

    if (this.selectScriptsType === "runtime-vars") {
      this.jobDefRuntimeVariable = {
        format: ValueFormat.TEXT,
        sensitive: false,
        value: '',
        key
      };

      this.$nextTick(() => {
        const keyInput: HTMLInputElement = this.$el.querySelector('.runtime-variable-input');

        keyInput.scrollIntoView();
        keyInput.focus();
      });
    } else {
      this.newRunJobVarKey = key;
      (<any>this.$refs.newRunJobVarKeyInput).focus();
      (<any>this.$refs.newRunJobVarKeyInput).scrollIntoView();
    }
  }

  private onCloseSelectScriptVarsClicked() {
    this.$modal.hide("select-script-vars-modal");
  }
}
</script>

<style lang="scss">
table {
  // The borders just make things really ugly
  td,
  th {
    border-width: 0 !important;
  }
}

.striped-table {
  tr:nth-child(odd) {
    background: hsl(0, 0%, 98%);
  } // no idea why the bulma is-striped didn't work
}

.validation-error {
  margin-top: 3px;
  margin-bottom: 3px;
  padding-left: 3px;
  padding-right: 3px;
  color: $danger;
  font-size: 18px;
}

.content-divider {
  background: red !important;
  height: 2px;
  margin: 0px !important;
  position: relative;
  left: 0px;
  top: -2px;
}

.navbar-divider {
  background-color: lightgray !important;
  height: 0.1rem !important;
  margin: 0px;
}

.nav-job {
  font-size: 18px;
  border: 0px solid lightgray;
  width: 200px;
  height: 100vh;
  overflow-y: auto;
  float: left;
}

// for resizing the nav-job panel
.nav-job-resizer {
  background: #eee;
  float: left;
  height: 100vh;
  width: 7px;
  border: 1px solid lightgray;
  border-bottom: none;
  cursor: col-resize;
  position: relative;
}

.col-resizer-icon {
  height: 30px;
  width: 7px;
  position: absolute;
  top: 0;
  bottom: 0;
  background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==")
    no-repeat;
  margin: auto;
  z-index: 1;
}

.nav-job-item {
  margin-left: 10px;
  cursor: pointer;
}

.icon-text-helper {
  vertical-align: middle !important;
}

.selected > .icon-text {
  font-weight: bold;
  cursor: pointer;
}

.tabs-container {
  padding-top: 0px;
  padding-left: 0px;
}

.tabs-container-item {
  border: 1px solid lightgray;
  border-bottom: none;
  background-color: var(--grey-bg-color);
  height: 100vh;
}

.edit-job {
  margin-left: 245px;
  margin-right: 10px;
}

.edit-step {
  background: lightgray;
  margin-right: 10px;
}

.button-spaced {
  margin-left: 10px;
}

.task-designer {
  border: 1px solid lightgray;
  border-left: none;
  border-top: none;
}

.task-designer-nav {
  background-color: $white-ter;
  padding: 8px;
  border-bottom: 1px solid lightgray;
}

.task-designer-body {
  background-color: var(--grey-bg-color);
  padding-top: 20px;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 10px;
  height: 81vh;
}

.task-step-icon {
  height: 15px !important;
  width: auto !important;
  vertical-align: middle !important;
}

.cron-options-table {
  display: block;
  height: 410px;
  overflow-y: scroll;
  border-width: 1px;
  border-style: solid;
  border-color: lightgray;
  padding: 8px;
  border-radius: 4px;
}

.sgg-list {
  overflow-y: scroll;
  display: block;
  height: 450px;
}

.has-background-deepskyblue {
  background: linear-gradient(to right, #00d2ff, #3a7bd5);
}

.job-menu a {
  font-variant-caps: all-small-caps;
  letter-spacing: 2px;
  margin-right: 1rem;
}

.job-menu .is-active {
  background: deepskyblue;
  color: white;
}

.has-max-width {
  max-width: 100%;
}

.text-nowrap {
  white-space: nowrap;
}

.error-message-left {
  width: 100%;
  top: 100%;
  left: 0;
}
</style>

<style lang="scss">
  .edit-schedule-modal .modal .modal-card {
    width: auto;
  }
</style>