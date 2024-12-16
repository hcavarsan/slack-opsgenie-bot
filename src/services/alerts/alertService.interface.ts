import { Alert, AlertCreationResult, AlertIdentifier } from '@/types/alert';

export interface IAlertService {
  createAlert(alert: Alert): Promise<AlertCreationResult>;
  getAlert(identifier: AlertIdentifier): Promise<Alert>;
  closeAlert(identifier: AlertIdentifier): Promise<void>;
  validateConnection(): Promise<void>;
}
