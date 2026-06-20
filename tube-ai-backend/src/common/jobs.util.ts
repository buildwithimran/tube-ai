import { JobStatus } from './enums/content-type.enum';

/** Map BullMQ's internal states to our public JobStatus contract. */
export function mapJobState(state: string): JobStatus {
  switch (state) {
    case 'completed':
      return JobStatus.COMPLETED;
    case 'failed':
      return JobStatus.FAILED;
    case 'active':
      return JobStatus.PROCESSING;
    default:
      return JobStatus.QUEUED; // waiting | delayed | prioritized | unknown
  }
}
