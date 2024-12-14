package service

import (
	"encoding/json"
	"fmt"

	"github.com/hcavarsan/slack-opsgenie-bot/internal/model"
	"github.com/sirupsen/logrus"
	"github.com/slack-go/slack"
)

type SlackService struct {
	client *slack.Client
	logger *logrus.Logger
}

func NewSlackService(token string) *SlackService {
	return &SlackService{
		client: slack.New(token),
		logger: logrus.New(),
	}
}

func NewSlackServiceWithLogger(token string, logger *logrus.Logger) *SlackService {
	if logger == nil {
		logger = logrus.New()
	}
	return &SlackService{
		client: slack.New(token),
		logger: logger,
	}
}

func (s *SlackService) OpenIncidentModal(triggerID string, channelInfo model.SlackCommand) error {
	modalView := slack.ModalViewRequest{
		Type: "modal",
		Title: &slack.TextBlockObject{
			Type:  "plain_text",
			Text:  "Create Incident",
			Emoji: true,
		},
		Submit: &slack.TextBlockObject{
			Type:  "plain_text",
			Text:  "Create",
			Emoji: true,
		},
		Close: &slack.TextBlockObject{
			Type:  "plain_text",
			Text:  "Cancel",
			Emoji: true,
		},
		Blocks: slack.Blocks{
			BlockSet: []slack.Block{
				&slack.InputBlock{
					Type:    "input",
					BlockID: "title_block",
					Label: &slack.TextBlockObject{
						Type:  "plain_text",
						Text:  "Title",
						Emoji: true,
					},
					Element: slack.NewPlainTextInputBlockElement(
						&slack.TextBlockObject{
							Type:  "plain_text",
							Text:  "Enter incident title",
							Emoji: true,
						},
						"title",
					),
				},
				&slack.InputBlock{
					Type:    "input",
					BlockID: "description_block",
					Label: &slack.TextBlockObject{
						Type:  "plain_text",
						Text:  "Description",
						Emoji: true,
					},
					Element: &slack.PlainTextInputBlockElement{
						Type:      slack.METPlainTextInput,
						ActionID:  "description",
						Multiline: true,
						Placeholder: &slack.TextBlockObject{
							Type:  "plain_text",
							Text:  "Describe the incident",
							Emoji: true,
						},
					},
					Optional: true,
				},
				&slack.InputBlock{
					Type:    "input",
					BlockID: "urgency_block",
					Label: &slack.TextBlockObject{
						Type:  "plain_text",
						Text:  "Urgency",
						Emoji: true,
					},
					Element: &slack.SelectBlockElement{
						Type:     slack.OptTypeStatic,
						ActionID: "urgency",
						Placeholder: &slack.TextBlockObject{
							Type:  "plain_text",
							Text:  "Select urgency level",
							Emoji: true,
						},
						Options: []*slack.OptionBlockObject{
							{
								Text: &slack.TextBlockObject{
									Type:  "plain_text",
									Text:  "Critical",
									Emoji: true,
								},
								Value: "critical",
							},
							{
								Text: &slack.TextBlockObject{
									Type:  "plain_text",
									Text:  "High",
									Emoji: true,
								},
								Value: "high",
							},
							{
								Text: &slack.TextBlockObject{
									Type:  "plain_text",
									Text:  "Medium",
									Emoji: true,
								},
								Value: "medium",
							},
							{
								Text: &slack.TextBlockObject{
									Type:  "plain_text",
									Text:  "Low",
									Emoji: true,
								},
								Value: "low",
							},
						},
						InitialOption: &slack.OptionBlockObject{
							Text: &slack.TextBlockObject{
								Type:  "plain_text",
								Text:  "Medium",
								Emoji: true,
							},
							Value: "medium",
						},
					},
				},
			},
		},
		CallbackID:      "incident_modal",
		ClearOnClose:    true,
		NotifyOnClose:   false,
		PrivateMetadata: s.createPrivateMetadata(channelInfo),
	}

	s.logger.WithFields(logrus.Fields{
		"trigger_id": triggerID,
		"channel_id": channelInfo.ChannelID,
	}).Debug("Opening modal")

	_, err := s.client.OpenView(triggerID, modalView)
	if err != nil {
		if err.Error() == "expired_trigger_id" {
			return fmt.Errorf("trigger ID expired, please try again")
		}
		return fmt.Errorf("failed to open modal: %w", err)
	}

	return nil
}
func (s *SlackService) createPrivateMetadata(channelInfo model.SlackCommand) string {
	metadata := struct {
		ChannelID   string `json:"channelId"`
		ChannelName string `json:"channelName"`
		TeamDomain  string `json:"teamDomain"`
	}{
		ChannelID:   channelInfo.ChannelID,
		ChannelName: channelInfo.ChannelName,
		TeamDomain:  channelInfo.TeamDomain,
	}

	bytes, err := json.Marshal(metadata)
	if err != nil {
		s.logger.WithError(err).Error("Failed to marshal private metadata")
		return "{}"
	}
	return string(bytes)
}

func (s *SlackService) SendMessage(channelID string, text string, blocks []slack.Block) error {
	options := []slack.MsgOption{
		slack.MsgOptionText(text, false),
	}

	if len(blocks) > 0 {
		options = append(options, slack.MsgOptionBlocks(blocks...))
	}

	_, _, err := s.client.PostMessage(channelID, options...)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"channel_id": channelID,
			"text":       text,
		}).Error("Failed to send message")
		return fmt.Errorf("failed to send message: %w", err)
	}

	return nil
}
