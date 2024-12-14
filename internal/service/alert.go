package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/hcavarsan/slack-opsgenie-bot/internal/model"
	"github.com/sirupsen/logrus"
)

type AlertService struct {
	apiKey  string
	teamID  string
	baseURL string
	domain  string
	logger  *logrus.Logger
}

func NewAlertService(apiKey, teamID string, domain string) *AlertService {
	if domain == "" {
		domain = "app"
	}
	return &AlertService{
		apiKey:  apiKey,
		teamID:  teamID,
		domain:  domain,
		baseURL: "https://api.opsgenie.com/v2",
		logger:  logrus.New(),
	}
}

func NewAlertServiceWithLogger(apiKey, teamID string, domain string, logger *logrus.Logger) *AlertService {
	if logger == nil {
		logger = logrus.New()
	}
	if domain == "" {
		domain = "app"
	}
	return &AlertService{
		apiKey:  apiKey,
		teamID:  teamID,
		domain:  domain,
		baseURL: "https://api.opsgenie.com/v2",
		logger:  logger,
	}
}

func (s *AlertService) CreateAlert(alert model.Alert) (*model.AlertCreationResult, error) {
	payload := map[string]interface{}{
		"message":     alert.Title,
		"description": alert.Description,
		"priority":    alert.Priority,
		"responders": []map[string]string{{
			"type": "team",
			"id":   s.teamID,
		}},
		"tags":   alert.Tags,
		"source": alert.Source,
		"alias":  fmt.Sprintf("slack-incident-%s-%d", alert.Reporter.ID, time.Now().Unix()),
		"details": map[string]string{
			"reportedBy":    alert.Reporter.Username,
			"slackUserId":   alert.Reporter.ID,
			"slackUsername": alert.Reporter.Name,
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("error marshaling alert: %w", err)
	}

	s.logger.WithField("payload", string(jsonPayload)).Debug("Creating OpsGenie alert")

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/alerts", s.baseURL), bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", "GenieKey "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	s.logger.WithFields(logrus.Fields{
		"status_code": resp.StatusCode,
		"response":    string(body),
	}).Debug("OpsGenie API response")

	if resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	var response struct {
		RequestID string `json:"requestId"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	time.Sleep(2 * time.Second)

	alertDetails, err := s.getAlertByRequestID(response.RequestID)
	if err != nil {
		s.logger.WithError(err).Error("Failed to get alert details")
		return &model.AlertCreationResult{
			ID:        response.RequestID,
			Title:     alert.Title,
			Priority:  alert.Priority,
			URL:       fmt.Sprintf("https://%s.app.opsgenie.com/alert/detail/%s/details", s.domain, response.RequestID),
			RequestID: response.RequestID,
		}, nil
	}

	return alertDetails, nil
}

func (s *AlertService) getAlertByRequestID(requestID string) (*model.AlertCreationResult, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/alerts/requests/%s", s.baseURL, requestID), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "GenieKey "+s.apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response struct {
		Data struct {
			Success bool   `json:"success"`
			Action  string `json:"action"`
			AlertID string `json:"alertId"`
			Status  string `json:"status"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	if !response.Data.Success {
		return nil, fmt.Errorf("alert creation was not successful")
	}

	return s.getAlertDetails(response.Data.AlertID)
}

func (s *AlertService) getAlertDetails(alertID string) (*model.AlertCreationResult, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/alerts/%s", s.baseURL, alertID), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "GenieKey "+s.apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response struct {
		Data struct {
			ID       string `json:"id"`
			Message  string `json:"message"`
			Priority string `json:"priority"`
			Tiny     string `json:"tinyId"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	alertURL := fmt.Sprintf("https://%s.app.opsgenie.com/alert/detail/%s/details",
		s.domain,
		response.Data.ID,
	)

	return &model.AlertCreationResult{
		ID:       response.Data.ID,
		Title:    response.Data.Message,
		Priority: model.AlertPriority(response.Data.Priority),
		URL:      alertURL,
	}, nil
}
