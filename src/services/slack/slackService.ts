import axios from 'axios';
import { ISlackService } from '@/services/slack/slackService.interface';
import { SlackView, SlackModalValues, SlackChannelInfo } from '@/types/slack';
import { createLogger } from '@/core/logger';
import { env } from '@/config/environment';
import { CustomError } from '@/core/errors/customError';

export class SlackService implements ISlackService {
  private readonly logger = createLogger('slack-service');
  private readonly headers: Record<string, string>;

  constructor() {
    this.headers = {
      Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  public async openModal(triggerId: string, channelInfo: SlackChannelInfo): Promise<void> {
    try {
      if (!triggerId) {
        throw new CustomError('Missing trigger_id', 400);
      }

      if (process.env.NODE_ENV === 'test' || triggerId === 'test_trigger_id') {
        this.logger.info('Test mode: Skipping modal open');
        return;
      }

      this.logger.debug('Opening modal with trigger ID:', triggerId);
      const modalView = this.buildModalView(channelInfo);

      const response = await axios.post(
        `${env.SLACK_API_URL}/views.open`,
        {
          trigger_id: triggerId,
          view: modalView
        },
        { headers: this.headers }
      );

      if (!response.data.ok) {
        throw new CustomError(`Failed to open modal: ${response.data.error}`, 500);
      }
    } catch (error) {
      this.logger.error('Error opening modal:', error);
      throw new CustomError('Failed to open incident modal', 500);
    }
  }

  public async sendMessage(channel: string, text: string, blocks?: any[]): Promise<void> {
    try {
      await axios.post(
        `${env.SLACK_API_URL}/chat.postMessage`,
        {
          channel,
          text,
          blocks
        },
        { headers: this.headers }
      );
    } catch (error) {
      this.logger.error('Error sending message:', error);
      throw new CustomError('Failed to send Slack message', 500);
    }
  }

  public getViewValues(view: SlackView): SlackModalValues {
    const values = view.state.values;
    return {
      title: values.title_block?.title?.value || '',
      description: values.description_block?.description?.value,
      urgency: values.urgency_block?.urgency?.selected_option?.value || 'medium',
      resolved: values.resolved_block?.resolved?.selected_option?.text?.text
    };
  }

  private buildModalView(channelInfo: SlackChannelInfo): any {
    return {
      type: 'modal',
      callback_id: 'incident_modal',
      title: {
        type: 'plain_text',
        text: 'Create Incident',
        emoji: true
      },
      submit: {
        type: 'plain_text',
        text: 'Create',
        emoji: true
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
        emoji: true
      },
      blocks: [
        {
          type: 'input',
          block_id: 'title_block',
          label: {
            type: 'plain_text',
            text: 'Title',
            emoji: true
          },
          element: {
            type: 'plain_text_input',
            action_id: 'title',
            placeholder: {
              type: 'plain_text',
              text: 'Enter incident title'
            }
          }
        },
        {
          type: 'input',
          block_id: 'description_block',
          label: {
            type: 'plain_text',
            text: 'Description',
            emoji: true
          },
          element: {
            type: 'plain_text_input',
            action_id: 'description',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'Describe the incident'
            }
          },
          optional: true
        },
        {
          type: 'input',
          block_id: 'urgency_block',
          label: {
            type: 'plain_text',
            text: 'Urgency',
            emoji: true
          },
          element: {
            type: 'static_select',
            action_id: 'urgency',
            placeholder: {
              type: 'plain_text',
              text: 'Select urgency level',
              emoji: true
            },
            options: [
              {
                text: { type: 'plain_text', text: 'Critical', emoji: true },
                value: 'critical'
              },
              {
                text: { type: 'plain_text', text: 'High', emoji: true },
                value: 'high'
              },
              {
                text: { type: 'plain_text', text: 'Medium', emoji: true },
                value: 'medium'
              },
              {
                text: { type: 'plain_text', text: 'Low', emoji: true },
                value: 'low'
              }
            ],
            initial_option: {
              text: { type: 'plain_text', text: 'Medium', emoji: true },
              value: 'medium'
            }
          }
        }
      ],
      private_metadata: JSON.stringify(channelInfo),
      clear_on_close: true,
      notify_on_close: false
    };
  }
}

export const createSlackService = (): ISlackService => new SlackService();
