export interface AlertIdentifier {
  id?: string;
  alias?: string;
}

export interface Alert {
  title: string;
  description?: string;
  priority: AlertPriority;
  source: string;
  tags: string[];
  reporter: AlertReporter;
  team: AlertTeam;
}

export type AlertPriority = 'P1' | 'P2' | 'P3' | 'P4';

export interface AlertReporter {
  id: string;
  name: string;
  username: string;
}

export interface AlertTeam {
  id: string;
  name: string;
}

export interface AlertCreationResult {
  id: string;
  alias: string;
  priority: AlertPriority;
  url: string;
  requestId: string;
}

export interface AlertDetails {
  reportedBy: string;
  slackUserId: string;
  originalUrgency: string;
  reportedFrom: string;
  slackUsername: string;
  slackTeam: string;
  slackChannel: string;
  reportedAt: string;
  environment: string;
}
