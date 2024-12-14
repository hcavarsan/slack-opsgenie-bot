import debug from 'debug';
import axios from 'axios';
import { Incident, AlertData, SlackView } from '../types';
import { CustomError } from '../utils/errors';

const logger = debug('slash-command-template:opsgenie-service');

/**
 * Service for interacting with OpsGenie API
 * Handles alert creation, retrieval and management
 */
export class OpsGenieService {
  private readonly baseUrl = 'https://api.opsgenie.com/v2';
  private readonly headers: Record<string, string>;
  private readonly priorityMap: Record<string, string> = {
    'critical': 'P1',
    'high': 'P2',
    'medium': 'P3',
    'low': 'P4',
    'p1': 'P1',
    'p2': 'P2',
    'p3': 'P3',
    'p4': 'P4'
  };

  constructor() {
    logger('Initializing OpsGenieService');
    if (!process.env.OPSGENIE_API_KEY) {
      logger('Error: OpsGenie API key is missing');
      throw new CustomError('OpsGenie API key is required', 500);
    }

    // Add more detailed API key logging
    const apiKey = process.env.OPSGENIE_API_KEY.trim();
    logger('API Key validation:');
    logger('- Length:', apiKey.length);
    logger('- Format:', /^[a-f0-9-]{36}$/.test(apiKey));
    logger('- First/Last 4 chars:',
      `${apiKey.slice(0,4)}...${apiKey.slice(-4)}`
    );

    // Validate API key format
    if (!apiKey.match(/^[a-f0-9-]{36}$/)) {
      logger('Error: Invalid OpsGenie API key format');
      throw new CustomError('Invalid OpsGenie API key format. Expected a 36-character UUID.', 500);
    }

    // Set headers with proper authorization
    this.headers = {
      'Authorization': `GenieKey ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Test the API key immediately
    this.testApiKey().catch(error => {
      logger('Warning: API key validation failed:', error.message);
    });

    logger('OpsGenie service configured with headers:', {
      ...this.headers,
      'Authorization': 'GenieKey ****...****'
    });
  }

  private async testApiKey(): Promise<void> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/alerts/count`,
        { headers: this.headers }
      );
      logger('API key validation successful:', response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API key validation failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Creates a new alert in OpsGenie
   * @param incident - Incident details to create alert from
   * @throws {CustomError} When API key is invalid or API request fails
   * @returns Promise resolving to created alert details
   */
  public async createAlert(incident: Incident): Promise<any> {
    logger('Creating alert with incident data: %O', incident);
    const alertData: AlertData = {
      message: `Incident Report: ${incident.title}`,
      description: this.formatDescription(incident),
      priority: this.mapUrgencyToPriority(incident.urgency),
      responders: [{
        type: 'team',
        id: process.env.OPSGENIE_TEAM_ID ?? ''
      }],
      tags: ['slack-incident'],
      details: {
        reportedBy: incident.userEmail,
        slackUserId: incident.userId,
        originalUrgency: incident.urgency,
        reportedFrom: 'Slack',
        slackUsername: incident.userName,
        slackTeam: incident.teamDomain,
        slackChannel: incident.channelName,
        reportedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      source: 'Slack',
      alias: `slack-incident-${incident.userId}-${Date.now()}`,
      entity: 'Slack Incident',
      note: `Created by ${incident.userName} (${incident.userEmail}) via Slack\nTeam: ${incident.teamDomain}\nChannel: ${incident.channelName}`
    };
    logger('Formatted alert data: %O', alertData);

    try {
      logger('Sending alert to OpsGenie');
      const response = await axios.post(
        `${this.baseUrl}/alerts`,
        alertData,
        { headers: this.headers }
      );

      // Construct the URL using the alias directly
      const result = {
        ...response.data,
        alias: alertData.alias,
        url: `https://${process.env.OPSGENIE_DOMAIN || 'kftray'}.app.opsgenie.com/alert/detail/${alertData.alias}/details`
      };

      // Try to get additional details with retries
      for (let i = 0; i < 3; i++) {
        try {
          // Wait a bit before trying to get details
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));

          const alertDetails = await axios.get(
            `${this.baseUrl}/alerts`,
            {
              headers: this.headers,
              params: {
                query: `alias: ${alertData.alias}`,
                limit: 1
              }
            }
          );

          if (alertDetails.data?.data?.[0]?.id) {
            result.id = alertDetails.data.data[0].id;
            result.url = `https://${process.env.OPSGENIE_DOMAIN || 'kftray'}.app.opsgenie.com/alert/detail/${result.id}/details`;
            break;
          }
        } catch (detailsError) {
          logger('Warning: Could not fetch alert details (attempt %d):', i + 1, detailsError);
          // Continue with next retry or use constructed URL
        }
      }

      logger('OpsGenie API response:', result);
      return result;
    } catch (error) {
      logger('Error creating alert:', error);
      if (axios.isAxiosError(error)) {
        logger('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
        throw new CustomError(
          `OpsGenie Error: ${error.response?.data?.message || error.message}`,
          error.response?.status || 500
        );
      }
      throw error;
    }
  }

  private mapUrgencyToPriority(urgency: string): string {
    const normalizedUrgency = urgency.toLowerCase();
    return this.priorityMap[normalizedUrgency] || 'P3'; // Default to P3 if not found
  }

  private formatDescription(incident: Incident): string {
    const { title, description, urgency, resolved, userName, userEmail, teamDomain, channelName } = incident;
    const isResolved = resolved === 'Sim';
    const timestamp = new Date().toISOString();

    const header = isResolved ? 'RESOLVED INCIDENT' : 'ACTIVE INCIDENT';
    const reporter = `Reporter: ${userName} (${userEmail})`;
    const location = `Reported from: ${teamDomain} / #${channelName}`;
    const timeInfo = `Time: ${timestamp}`;

    const details = isResolved
      ? `Start Time: ${title}\nEnd Time: ${description}\nRoot Cause: ${urgency}`
      : `Start Time: ${title}\nExpected Resolution: ${description}\nCause: ${urgency}`;

    return `${header}\n\n${reporter}\n${location}\n${timeInfo}\n\n${details}`;
  }

  /**
   * Retrieves an alert from OpsGenie
   * @param identifier - Alert identifier
   * @throws {Error} When API request fails
   * @returns Promise resolving to alert details
   */
  public async getAlert(identifier: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/alerts/${identifier}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get OpsGenie alert: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Closes an alert in OpsGenie
   * @param identifier - Alert identifier
   * @throws {CustomError} When API request fails
   */
  public async closeAlert(identifier: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/alerts/${identifier}/close`,
        {},
        { headers: this.headers }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new CustomError(
          `Failed to close OpsGenie alert: ${error.response?.data?.message || error.message}`,
          error.response?.status || 500
        );
      }
      throw error;
    }
  }

  /**
   * Creates an incident from Slack view submission
   * @param userId - Slack user ID
   * @param view - Slack view data
   * @returns Promise resolving to created alert details
   */
  public async createIncident(userId: string, view: SlackView): Promise<any> {
    const values = view.state.values;
    return this.createAlert({
      userId,
      userName: 'testuser',  // Default test values
      teamDomain: 'testteam',
      teamId: 'T123',
      channelName: 'testchannel',
      channelId: 'C123',
      title: values.title_block.title.value,
      description: values.description_block.description.value || 'No description provided',
      urgency: values.urgency_block.urgency.value || 'medium',
      resolved: values.resolved_block?.resolved?.selected_option?.text?.text || 'No',
      userEmail: `${userId}@example.com`
    });
  }
}

/**
 * Creates a new instance of OpsGenieService
 * @returns New OpsGenieService instance
 */
export const createOpsGenieService = () => new OpsGenieService();
