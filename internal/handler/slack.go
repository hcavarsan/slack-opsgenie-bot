package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/hcavarsan/slack-opsgenie-bot/internal/model"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/service"
	"github.com/sirupsen/logrus"
	"github.com/slack-go/slack"
)

type SlackHandler struct {
	slackService  *service.SlackService
	alertService  *service.AlertService
	signingSecret string
	logger        *logrus.Logger
}

func NewSlackHandler(
	slackService *service.SlackService,
	alertService *service.AlertService,
	signingSecret string,
	logger *logrus.Logger,
) *SlackHandler {
	return &SlackHandler{
		slackService:  slackService,
		alertService:  alertService,
		signingSecret: signingSecret,
		logger:        logger,
	}
}

func (h *SlackHandler) HandleSlashCommand(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.WithError(err).Error("Failed to read request body")
		http.Error(w, "Failed to read request", http.StatusBadRequest)
		return
	}
	r.Body = io.NopCloser(bytes.NewBuffer(body))

	verifier, err := slack.NewSecretsVerifier(r.Header, h.signingSecret)
	if err != nil {
		h.logger.WithError(err).Error("Failed to create verifier")
		http.Error(w, "Verification failed", http.StatusUnauthorized)
		return
	}

	verifier.Write(body)
	if err := verifier.Ensure(); err != nil {
		h.logger.WithError(err).Error("Failed to verify request")
		http.Error(w, "Verification failed", http.StatusUnauthorized)
		return
	}

	cmd, err := slack.SlashCommandParse(r)
	if err != nil {
		h.logger.WithError(err).Error("Failed to parse slash command")
		http.Error(w, "Invalid slash command", http.StatusBadRequest)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"command":    cmd.Command,
		"user_id":    cmd.UserID,
		"channel_id": cmd.ChannelID,
		"trigger_id": cmd.TriggerID,
	}).Info("Received slash command")

	slackCmd := model.SlackCommand{
		TeamID:      cmd.TeamID,
		ChannelID:   cmd.ChannelID,
		ChannelName: cmd.ChannelName,
		UserID:      cmd.UserID,
		UserName:    cmd.UserName,
		Command:     cmd.Command,
		TriggerID:   cmd.TriggerID,
		TeamDomain:  cmd.TeamDomain,
	}

	w.WriteHeader(http.StatusOK)

	if err := h.slackService.OpenIncidentModal(cmd.TriggerID, slackCmd); err != nil {
		h.logger.WithError(err).Error("Failed to open modal")
		errorMsg := "Sorry, something went wrong while opening the incident form. Please try again."
		h.sendErrorMessage(cmd.ChannelID, errorMsg)
		return
	}
}

func (h *SlackHandler) HandleInteractivity(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.WithError(err).Error("Failed to read request body")
		http.Error(w, "Failed to read request", http.StatusBadRequest)
		return
	}
	r.Body = io.NopCloser(bytes.NewBuffer(body))

	var payload slack.InteractionCallback
	err = json.Unmarshal([]byte(r.FormValue("payload")), &payload)
	if err != nil {
		h.logger.WithError(err).Error("Failed to parse interaction payload")
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if payload.Type != slack.InteractionTypeViewSubmission {
		w.WriteHeader(http.StatusOK)
		return
	}

	values := payload.View.State.Values
	title := values["title_block"]["title"].Value
	description := values["description_block"]["description"].Value
	urgency := values["urgency_block"]["urgency"].SelectedOption.Value

	alert := &model.Alert{
		Title:       title,
		Description: description,
		Priority:    h.mapUrgencyToPriority(urgency),
		Source:      "Slack",
		Tags:        []string{"slack-incident"},
		Reporter: model.Reporter{
			ID:       payload.User.ID,
			Name:     payload.User.Name,
			Username: payload.User.Name,
		},
		Team: model.Team{
			ID:   payload.Team.ID,
			Name: payload.Team.Domain,
		},
	}

	result, err := h.alertService.CreateAlert(*alert)
	if err != nil {
		h.logger.WithError(err).Error("Failed to create alert")
		h.sendErrorMessage(payload.User.ID, "Failed to create incident. Please try again.")
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := h.sendSuccessMessage(payload.User.ID, result); err != nil {
		h.logger.WithError(err).Error("Failed to send success message")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"response_action": "clear"})
}
func (h *SlackHandler) sendSuccessMessage(userID string, result *model.AlertCreationResult) error {
	blocks := []slack.Block{
		&slack.SectionBlock{
			Type: slack.MBTSection,
			Text: &slack.TextBlockObject{
				Type: slack.MarkdownType,
				Text: fmt.Sprintf("✅ *Incident created successfully!*\n\n"+
					"*Title:* %s\n"+
					"*Priority:* %s\n"+
					"*ID:* %s",
					result.Title,
					string(result.Priority),
					result.ID),
			},
		},
	}

	if result.URL != "" {
		blocks = append(blocks, &slack.SectionBlock{
			Type: slack.MBTSection,
			Text: &slack.TextBlockObject{
				Type: slack.MarkdownType,
				Text: fmt.Sprintf("🔗 <%s|View in OpsGenie>", result.URL),
			},
		})
	}

	return h.slackService.SendMessage(userID, "Incident created successfully!", blocks)
}
func (h *SlackHandler) sendErrorMessage(userID, message string) {
	blocks := []slack.Block{
		&slack.SectionBlock{
			Type: slack.MBTSection,
			Text: &slack.TextBlockObject{
				Type: slack.MarkdownType,
				Text: "❌ " + message,
			},
		},
	}

	if err := h.slackService.SendMessage(userID, message, blocks); err != nil {
		h.logger.WithError(err).Error("Failed to send error message")
	}
}

func (h *SlackHandler) mapUrgencyToPriority(urgency string) model.AlertPriority {
	switch urgency {
	case "critical":
		return model.PriorityP1
	case "high":
		return model.PriorityP2
	case "medium":
		return model.PriorityP3
	case "low":
		return model.PriorityP4
	default:
		return model.PriorityP3
	}
}
