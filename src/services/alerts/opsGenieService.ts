/* eslint-disable max-len */
import axios from 'axios';
import { IAlertService } from './alertService.interface';
import { Alert, AlertCreationResult, AlertIdentifier, AlertPriority } from '@/types/alert';
import { createLogger } from '@/core/logger';
import { env } from '@/config/environment';
import { CustomError } from '@/core/errors/customError';

export class OpsGenieService implements IAlertService {
  private readonly logger = createLogger('opsgenie-service');
  private readonly baseUrl = 'https://api.opsgenie.com/v2';
  private readonly headers: Record<string, string>;
  private readonly priorityMap: Record<string, AlertPriority> = {
    critical: 'P1',
    high: 'P2',
    medium: 'P3',
    low: 'P4'
  };

  constructor() {
    this.headers = {
      Authorization: `GenieKey ${env.OPSGENIE_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  public async validateConnection(): Promise<void> {
    try {
      await axios.get(`${this.baseUrl}/alerts/count`, { headers: this.headers });
    } catch {
      throw new CustomError('Failed to validate OpsGenie connection', 500);
    }
  }

  public async createAlert(alert: Alert): Promise<AlertCreationResult> {
    try {
      const alertData = this.formatAlertData(alert);
      const response = await axios.post(`${this.baseUrl}/alerts`, alertData, {
        headers: this.headers
      });

      if (!response?.data?.requestId) {
        throw new CustomError('Invalid response from OpsGenie', 500);
      }

      const alertDetails = await this.waitForAlert(response.data.requestId, alertData.alias);

      const result: AlertCreationResult = {
        id: alertDetails.id,
        alias: alertData.alias,
        priority: alertData.priority as AlertPriority,
        url: `https://${env.OPSGENIE_DOMAIN}.app.opsgenie.com/alert/detail/${alertDetails.id}/details`,
        requestId: response.data.requestId
      };

      this.logger.debug('Created alert:', result);

      return result;
    } catch (error) {
      throw await this.handleApiError(error, 'create alert');
    }
  }

  public async getAlert(identifier: AlertIdentifier): Promise<Alert> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/alerts/${identifier.id || identifier.alias}`,
        { headers: this.headers }
      );

      return this.mapResponseToAlert(response.data.data);
    } catch (error) {
      throw await this.handleApiError(error, 'get alert');
    }
  }

  public async closeAlert(identifier: AlertIdentifier): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/alerts/${identifier.id || identifier.alias}/close`,
        {},
        { headers: this.headers }
      );
    } catch (error) {
      throw await this.handleApiError(error, 'close alert');
    }
  }

  private formatAlertData(alert: Alert): any {
    return {
      message: alert.title,
      description: alert.description,
      priority: this.mapUrgencyToPriority(alert.priority),
      responders: [
        {
          type: 'team',
          id: env.OPSGENIE_TEAM_ID
        }
      ],
      tags: alert.tags,
      source: alert.source,
      alias: `slack-incident-${alert.reporter.id}-${Date.now()}`,
      entity: 'Slack Incident',
      details: {
        reportedBy: alert.reporter.username,
        slackUserId: alert.reporter.id,
        slackUsername: alert.reporter.name,
        environment: env.NODE_ENV
      }
    };
  }
  private mapUrgencyToPriority(urgency: string): AlertPriority {
    return this.priorityMap[urgency.toLowerCase()] || 'P3';
  }

  private mapResponseToAlert(data: any): Alert {
    return {
      title: data.message,
      description: data.description,
      priority: data.priority,
      source: data.source,
      tags: data.tags,
      reporter: {
        id: data.details.slackUserId,
        name: data.details.slackUsername,
        username: data.details.reportedBy
      },
      team: {
        id: env.OPSGENIE_TEAM_ID,
        name: 'Default Team'
      }
    };
  }

  private async handleApiError(error: any, operation: string): Promise<never> {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new CustomError('Rate limit exceeded', 429);
      }
      throw new CustomError(
        `Failed to ${operation}: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
    throw error;
  }

  private async waitForAlert(
    requestId: string,
    alias: string,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, delay));

        const response = await axios.get(`${this.baseUrl}/alerts`, {
          headers: this.headers,
          params: {
            query: `alias: ${alias}`,
            limit: 1
          }
        });

        if (response.data?.data?.[0]) {
          return {
            id: response.data.data[0].id,
            tinyId: response.data.data[0].tinyId
          };
        }

        if (attempt === maxAttempts) {
          return {
            id: requestId,
            tinyId: requestId
          };
        }

        this.logger.warn(`Attempt ${attempt}: Alert not found yet, retrying...`);
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        this.logger.warn(`Attempt ${attempt} failed to get alert, retrying...`);
      }
    }
    return {
      id: requestId,
      tinyId: requestId
    };
  }
}

export const createOpsGenieService = (): IAlertService => new OpsGenieService();
