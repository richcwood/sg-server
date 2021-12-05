import { RootState } from '../types';
import { GetterTree } from 'vuex';
import { JobCoreState, Job, JobFetchType } from './types';
import moment from 'moment';
import { getMoment } from '../../utils/DateTime';

export const getters: GetterTree<JobCoreState, RootState> = {
  getBySelectedJobFetchType: (state) => {
    return () => {
        const today = moment();
        today.startOf('day');
    
        let daysDiff;
    
        if(state.selectedJobFetchType == JobFetchType.TODAY){
          daysDiff = 1;
        }
        else if(state.selectedJobFetchType == JobFetchType.LAST_SEVEN_DAYS){
          daysDiff = 7;
        }
        else if(state.selectedJobFetchType == JobFetchType.LAST_MONTH){
          const monthAgo = moment(today);
          monthAgo.add(-1, 'month');
          daysDiff = today.diff(monthAgo, 'day');
        }
        else if(state.selectedJobFetchType == JobFetchType.LAST_TWO_MONTHS){
          const twoMonthsAgo = moment(today);
          twoMonthsAgo.add(-2, 'month');
          daysDiff = today.diff(twoMonthsAgo, 'day');
        }
        // else if(state.selectedJobFetchType == JobFetchType.LAST_YEAR){
        //   const twelveMonthsAgo = moment(today);
        //   twelveMonthsAgo.add(-12, 'month');
        //   daysDiff = today.diff(twelveMonthsAgo, 'day');
        // }
        else {
          throw 'Unknown JobFetchType in JobMonitor' + state.selectedJobFetchType;
        }
    
        return state.models.filter((job: Job) => {
          const jobDate = getMoment(job.dateStarted);
          jobDate.startOf('day');
          return today.diff(jobDate, 'day') <= daysDiff;
        });
      }
  }
};
