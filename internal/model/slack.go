package model

type SlackCommand struct {
	Token       string `form:"token"`
	TeamID      string `form:"team_id"`
	TeamDomain  string `form:"team_domain"`
	ChannelID   string `form:"channel_id"`
	ChannelName string `form:"channel_name"`
	UserID      string `form:"user_id"`
	UserName    string `form:"user_name"`
	Command     string `form:"command"`
	Text        string `form:"text"`
	ResponseURL string `form:"response_url"`
	TriggerID   string `form:"trigger_id"`
}

type ModalSubmission struct {
	Type        string `json:"type"`
	CallbackID  string `json:"callback_id"`
	TriggerID   string `json:"trigger_id"`
	View        View   `json:"view"`
	ResponseURL string `json:"response_url"`
}

type View struct {
	State           ViewState `json:"state"`
	PrivateMetadata string    `json:"private_metadata"`
}

type ViewState struct {
	Values map[string]map[string]struct {
		Value          string `json:"value"`
		SelectedOption struct {
			Value string `json:"value"`
		} `json:"selected_option"`
	} `json:"values"`
}
