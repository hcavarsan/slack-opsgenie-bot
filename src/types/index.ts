export interface Incident {
	userId: string;
	userName: string;
	teamDomain: string;
	teamId: string;
	channelName: string;
	channelId: string;
	title: string;
	description: string;
	urgency: string;
	resolved: string;
	userEmail: string;
}

export interface AlertData {
	message: string;
	description: string;
	priority: string;
	responders: Array<{
		type: string;
		id: string;
	}>;
	tags: string[];
	details: {
		reportedBy: string;
		slackUserId: string;
		originalUrgency: string;
		reportedFrom: string;
		slackUsername: string;
		slackTeam: string;
		slackChannel: string;
		reportedAt: string;
		environment: string;
	};
	source: string;
	alias: string;
	entity: string;
	note: string;
}

export interface SlackView {
	state: {
		values: {
			title_block: {
				title: {
					value: string;
				};
			};
			description_block: {
				description: {
					value: string;
				};
			};
			urgency_block: {
				urgency: {
					value: string;
					selected_option?: {
						text: {
							text: string;
						};
					};
				};
			};
			resolved_block?: {
				resolved: {
					selected_option?: {
						text: {
							text: string;
						};
					};
				};
			};
		};
	};
}
