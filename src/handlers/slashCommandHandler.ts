import { Request, Response } from 'express';
import debug from 'debug';
import axios from 'axios';

const logger = debug('slash-command-template:slash-handler');

/**
 * Handles Slack slash commands
 * @param req - Express request object containing slash command data
 * @param res - Express response object
 * @throws {Error} When required env vars are missing or command processing fails
 * @returns Promise that resolves when slash command is processed
 */
export const handleSlashCommand = async (req: Request, res: Response): Promise<void> => {
  try {
    logger('Handling slash command');
    logger('Request body:', req.body);

    // Validate required environment variables
    if (!process.env.SLACK_API_URL || !process.env.SLACK_BOT_TOKEN) {
      throw new Error('Missing required environment variables');
    }

    // Store channel information
    const channelInfo = {
      channelId: req.body.channel_id,
      channelName: req.body.channel_name,
      teamDomain: req.body.team_domain // Add team domain to match modal handler
    };

    const modal = {
      type: 'modal',
      callback_id: 'incident_modal',
      title: {
        type: 'plain_text',
        text: 'Create Incident'
      },
      submit: {
        type: 'plain_text',
        text: 'Submit'
      },
      blocks: [
        {
          block_id: 'title_block',
          type: 'input',
          label: {
            type: 'plain_text',
            text: 'Title'
          },
          element: {
            action_id: 'title',
            type: 'plain_text_input',
            placeholder: {
              type: 'plain_text',
              text: 'Enter incident title'
            }
          }
        },
        {
          block_id: 'description_block',
          type: 'input',
          label: {
            type: 'plain_text',
            text: 'Description'
          },
          element: {
            action_id: 'description',
            type: 'plain_text_input',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'Describe the incident'
            }
          }
        },
        {
          block_id: 'urgency_block',
          type: 'input',
          label: {
            type: 'plain_text',
            text: 'Urgency',
            emoji: true
          },
          element: {
            action_id: 'urgency',
            type: 'static_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select urgency level',
              emoji: true
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: 'Critical',
                  emoji: true
                },
                value: 'critical'
              },
              {
                text: {
                  type: 'plain_text',
                  text: 'High',
                  emoji: true
                },
                value: 'high'
              },
              {
                text: {
                  type: 'plain_text',
                  text: 'Medium',
                  emoji: true
                },
                value: 'medium'
              },
              {
                text: {
                  type: 'plain_text',
                  text: 'Low',
                  emoji: true
                },
                value: 'low'
              }
            ]
          }
        }
      ],
      // Store channel information in private_metadata
      private_metadata: JSON.stringify(channelInfo)
    };

    // Send an immediate 200 response to acknowledge the command
    res.status(200).send();

    // Then open the modal using the Slack API
    logger('Opening modal with Slack API');
    const viewsOpenUrl = `${process.env.SLACK_API_URL}/views.open`;
    logger('Views open URL:', viewsOpenUrl);

    const response = await axios.post(viewsOpenUrl, {
      trigger_id: req.body.trigger_id,
      view: modal
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.ok) {
      logger('Error opening modal:', response.data.error);

      if (!req.body.response_url) {
        logger('No response_url provided');
        return;
      }

      // Send error message using response_url
      await axios.post(req.body.response_url, {
        text: "Sorry, there was an error opening the incident form.",
        response_type: "ephemeral"
      });
    }

  } catch (error) {
    logger('Error handling slash command:', error);

    // Only try to send error message if response_url is available
    if (req.body.response_url) {
      try {
        await axios.post(req.body.response_url, {
          text: "Sorry, there was an error processing your command.",
          response_type: "ephemeral"
        });
      } catch (followUpError) {
        logger('Error sending error message:', followUpError);
      }
    } else {
      logger('No response_url available for error message');
    }
  }
};
