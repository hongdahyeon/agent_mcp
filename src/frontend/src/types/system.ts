
export interface SystemHealth {
  db: 'OK' | 'ERROR';
  smtp: 'OK' | 'ERROR';
  scheduler: 'ON' | 'OFF' | 'ERROR';
}

export interface SchedulerJob {
  id: string;
  name: string;
  next_run_time: string | null;
  args: string;
  pending: boolean;
}