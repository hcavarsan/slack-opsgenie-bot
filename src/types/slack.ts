export interface SlackCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackView {
  type: string;
  callback_id: string;
  state: {
    values: {
      [key: string]: {
        [key: string]: {
          value?: string;
          selected_option?: {
            value: string;
            text: {
              text: string;
            };
          };
        };
      };
    };
  };
  private_metadata?: string;
}

export interface SlackModalValues {
  title: string;
  description?: string;
  urgency: string;
  resolved?: string;
}

export interface SlackChannelInfo {
  channelId: string;
  channelName: string;
  teamDomain: string;
}

export interface SlackUserInfo {
  id: string;
  name: string;
  email?: string;
}
