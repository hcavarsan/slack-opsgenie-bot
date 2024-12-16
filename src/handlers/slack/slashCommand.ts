import { Request, Response } from 'express';
import { createLogger } from '@/core/logger';
import { createSlackService } from '@/services/slack/slackService';
import { SlackChannelInfo } from '@/types/slack';
import { CustomError } from '@/core/errors/customError';

const logger = createLogger('slash-command-handler');
const slackService = createSlackService();

export async function handleSlashCommand(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Processing slash command');

    logger.debug('Request body:', req.body);

    if (!req.body.trigger_id) {
      throw new CustomError('Missing trigger_id in slash command', 400);
    }

    const channelInfo: SlackChannelInfo = {
      channelId: req.body.channel_id,
      channelName: req.body.channel_name,
      teamDomain: req.body.team_domain
    };

    res.status(200).send();

    await slackService.openModal(req.body.trigger_id, channelInfo);
  } catch (error) {
    handleSlashCommandError(error, req);
  }
}

async function handleSlashCommandError(error: unknown, req: Request): Promise<void> {
  logger.error('Error handling slash command:', error);

  if (req.body.response_url) {
    try {
      await slackService.sendMessage(
        req.body.channel_id,
        error instanceof CustomError ? error.message : 'An unexpected error occurred',
        []
      );
    } catch (followUpError) {
      logger.error('Error sending error message:', followUpError);
    }
  }
}
