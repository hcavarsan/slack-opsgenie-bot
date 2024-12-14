package slack_opsgenie_bot

import (
	"net/http"
	"os"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/config"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/handler"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/service"
	"github.com/sirupsen/logrus"
)

func init() {
	functions.HTTP("SlackOpsGenieBot", slackOpsgenieBotFunction)
}

func slackOpsgenieBotFunction(w http.ResponseWriter, r *http.Request) {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})

	if os.Getenv("DEBUG") == "true" {
		logger.SetLevel(logrus.DebugLevel)
	}

	cfg, err := config.Load()
	if err != nil {
		logger.Fatalf("Failed to load config: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
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

	switch r.URL.Path {
	case "/slack/commands":
		slackHandler.HandleSlashCommand(w, r)
	case "/slack/interactivity":
		slackHandler.HandleInteractivity(w, r)
	case "/health":
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	default:
		http.NotFound(w, r)
	}
}
