package main

import (
	"os"

	"github.com/hcavarsan/slack-opsgenie-bot/internal/api"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/config"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/handler"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/service"
	"github.com/sirupsen/logrus"
)

func main() {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})

	if os.Getenv("DEBUG") == "true" {
		logger.SetLevel(logrus.DebugLevel)
	}

	cfg, err := config.Load()
	if err != nil {
		logger.Fatalf("Failed to load config: %v", err)
	}

	slackService := service.NewSlackServiceWithLogger(cfg.SlackBotToken, logger)
	alertService := service.NewAlertServiceWithLogger(
		cfg.OpsGenieAPIKey,
		cfg.OpsGenieTeamID,
		cfg.OpsgenieDomain,
		logger,
	)
	slackHandler := handler.NewSlackHandler(
		slackService,
		alertService,
		cfg.SlackSigningSecret,
		logger,
	)

	server := api.NewServer(slackHandler, logger, cfg.Port)

	logger.WithField("port", cfg.Port).Info("Starting server...")
	if err := server.Start(); err != nil {
		logger.Fatalf("Server failed to start: %v", err)
	}
}
