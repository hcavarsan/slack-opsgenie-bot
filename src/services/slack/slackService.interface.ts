import { SlackView, SlackModalValues, SlackChannelInfo } from '@/types/slack';

export interface ISlackService {
  openModal(triggerId: string, channelInfo: SlackChannelInfo): Promise<void>;
  sendMessage(channel: string, text: string, blocks?: any[]): Promise<void>;
  getViewValues(view: SlackView): SlackModalValues;
}
