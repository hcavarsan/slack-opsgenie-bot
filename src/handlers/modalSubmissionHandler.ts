import { Request, Response } from 'express';
import debug from 'debug';
import { createOpsGenieService } from '../services/opsGenieService';
import axios, { AxiosError } from 'axios';
import { CustomError } from '../utils/errors';

const logger = debug('slash-command-template:modal-handler');

interface OpsGenieErrorResponse {
  message: string;
  code?: number;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface OpsGenieResult {
  success: boolean;
  url: string;
  alias: string;
  requestId: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

/**
 * Handles Slack modal submission events
 * @param req - Express request object containing modal submission payload
 * @param res - Express response object
 * @throws {Error} When payload is invalid or processing fails
 * @returns Promise that resolves when modal submission is processed
 */
export const handleModalSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    logger('Handling modal submission');
    logger('Raw request body:', JSON.stringify(req.body, null, 2));

    // Handle both direct JSON and payload string formats
    let payload;
    try {
      if (typeof req.body.payload === 'string') {
        logger('Parsing string payload');
        payload = JSON.parse(req.body.payload);
      } else if (req.body.payload && typeof req.body.payload === 'object') {
        logger('Using payload object directly');
        payload = req.body.payload;
      } else if (req.body.type === 'view_submission') {
        logger('Using direct body as payload');
        payload = req.body;
      } else {
        logger('Invalid payload format:', req.body);
        throw new Error('Invalid payload format');
      }
    } catch (error) {
      logger('Error processing payload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing payload';
      throw new Error(`Failed to process payload: ${errorMessage}`);
    }

    logger('Processed payload:', JSON.stringify(payload, null, 2));

    if (!payload.type || !payload.view?.callback_id) {
      logger('Invalid payload structure:', payload);
      throw new Error('Invalid payload structure');
    }

    if (payload.type === 'view_submission' && payload.view.callback_id === 'incident_modal') {
      const values = payload.view.state.values;
      logger('Modal values:', JSON.stringify(values, null, 2));

      // Validate required fields
      if (!values.title_block?.title?.value) {
        logger('Missing title value');
        res.status(200).json({
          response_action: "errors",
          errors: {
            title_block: "Title is required"
          }
        });
        return;
      }

      // Parse the private_metadata to get channel information
      const channelInfo = JSON.parse(payload.view.private_metadata || '{}');
      logger('Channel Info:', channelInfo);

      const title = values.title_block.title.value;
      const description = values.description_block.description.value;
      const urgency = values.urgency_block.urgency.selected_option.value;

      logger('Creating OpsGenie alert with values:', { title, description, urgency, channelInfo });

      const opsGenieService = createOpsGenieService();

      try {
        const result = await opsGenieService.createAlert({
          userId: payload.user.id,
          userName: payload.user.name,
          teamDomain: payload.team.domain,
          teamId: payload.team.id,
          channelName: channelInfo.channelName || 'unknown',
          channelId: channelInfo.channelId || 'unknown',
          title,
          description,
          urgency,
          resolved: 'No',
          userEmail: `${payload.user.name}`
        }) as OpsGenieResult;

        // Send DM to user
        await axios.post('https://slack.com/api/chat.postMessage', {
          channel: payload.user.id,
          text: `✅ Incident created successfully!\nTitle: ${title}\nUrgency: ${urgency}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `✅ *Incident created successfully!*\n\n*Title:* ${title}\n*Priority:* ${priorityDisplay[result.priority as keyof typeof priorityDisplay] || urgency}`
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `🔗 <${result.url}|View in OpsGenie>`
              }
            }
          ]
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        // Return empty response to close modal
        logger('Returning empty response to close modal');
        res.status(200).json({});

      } catch (error) {
        logger('Error creating OpsGenie alert:', error);

        let errorMessage = "There was an error processing your submission. Please try again.";
        if (error instanceof CustomError) {
          errorMessage = error.message;
        } else if (error instanceof AxiosError && error.response?.data?.message) {
          errorMessage = `OpsGenie Error: ${error.response.data.message}`;
        }

        // Return error in modal
        logger('Returning error to modal:', errorMessage);
        res.status(200).json({
          response_action: "errors",
          errors: {
            title_block: errorMessage
          }
        });
      }
    } else {
      throw new Error('Unexpected payload type or callback_id');
    }
  } catch (error) {
    logger('Error handling modal submission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Return error in modal
    logger('Returning error to modal:', errorMessage);
    res.status(200).json({
      response_action: "errors",
      errors: {
        title_block: `Error: ${errorMessage}`
      }
    });
  }
};

const priorityDisplay: Record<string, string> = {
  'P1': 'Critical',
  'P2': 'High',
  'P3': 'Medium',
  'P4': 'Low'
};
