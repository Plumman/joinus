import {ProgressStatusEnum} from './progress-enum';

export interface ProgressStatus {
  status: ProgressStatusEnum;
  percentage?: number;
}