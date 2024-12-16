import { Request, Response } from 'express';
import { createLogger } from '@/core/logger';
import { createSlackService } from '@/services/slack/slackService';
import { createOpsGenieService } from '@/services/alerts/opsGenieService';
import { Alert } from '@/types/alert';

const logger = createLogger('modal-submission-handler');
const slackService = createSlackService();
const alertService = createOpsGenieService();

export async function handleModalSubmission(req: Request, res: Response): Promise<Response> {
  try {
    const payload = parsePayload(req.body);

    if (!isValidModalSubmission(payload)) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const modalValues = slackService.getViewValues(payload.view);

    if (!modalValues.title) {
      return res.status(200).json({
        response_action: 'errors',
        errors: {
          title_block: 'Title is required'
        }
      });
    }

    const channelInfo = JSON.parse(payload.view.private_metadata || '{}');
    const alert = createAlertFromModalValues(modalValues, payload.user, channelInfo);

    try {
      const result = await alertService.createAlert(alert);

      await sendSuccessMessage(payload.user.id, {
        title: modalValues.title,
        priority: result.priority,
        url: result.url,
        id: result.id
      });

      return res.status(200).json({
        response_action: 'clear'
      });
    } catch (alertError) {
      logger.error('Failed to create alert:', alertError);

      await slackService.sendMessage(
        payload.user.id,
        'Failed to create incident. Please try again.',
        []
      );

      return res.status(200).json({
        response_action: 'clear'
      });
    }
  } catch (error) {
    return handleModalError(error, res);
  }
}

function parsePayload(body: any): any {
  if (typeof body.payload === 'string') {
    return JSON.parse(body.payload);
  }
  return body.payload || body;
}

function isValidModalSubmission(payload: any): boolean {
  return payload.type === 'view_submission' && payload.view?.callback_id === 'incident_modal';
}

function createAlertFromModalValues(values: any, user: any, channelInfo: any): Alert {
  return {
    title: values.title,
    description: values.description,
    priority: values.urgency,
    source: 'Slack',
    tags: ['slack-incident'],
    reporter: {
      id: user.id,
      name: user.name,
      username: `${user.name}`
    },
    team: {
      id: channelInfo.teamId || '',
      name: channelInfo.teamDomain || ''
    }
  };
}

async function sendSuccessMessage(
  userId: string,
  alertInfo: {
    title: string;
    priority: string;
    url: string;
    id: string;
  }
): Promise<void> {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '✅ *Incident created successfully!*\n\n' +
          `*Title:* ${alertInfo.title}\n` +
          `*Priority:* ${alertInfo.priority}\n` +
          `*ID:* ${alertInfo.id}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔗 <${alertInfo.url}|View in OpsGenie>`
      }
    }
  ];

  await slackService.sendMessage(userId, 'Incident created successfully!', blocks);
}

async function handleModalError(error: unknown, res: Response): Promise<Response> {
  logger.error('Modal submission error:', error);

  return res.status(200).json({
    response_action: 'clear'
  });
}
