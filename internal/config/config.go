package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	SlackSigningSecret string
	SlackBotToken      string
	OpsGenieAPIKey     string
	OpsGenieTeamID     string
	OpsgenieDomain     string
	Port               string
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		fmt.Printf("Warning: .env file not found, using environment variables\n")
	}

	config := &Config{
		SlackSigningSecret: os.Getenv("SLACK_SIGNING_SECRET"),
		SlackBotToken:      os.Getenv("SLACK_BOT_TOKEN"),
		OpsGenieAPIKey:     os.Getenv("OPSGENIE_API_KEY"),
		OpsGenieTeamID:     os.Getenv("OPSGENIE_TEAM_ID"),
		OpsgenieDomain:     os.Getenv("OPSGENIE_DOMAIN"),
		Port:               os.Getenv("PORT"),
	}

	if config.OpsgenieDomain == "" {
		config.OpsgenieDomain = "app"
	}
	if config.Port == "" {
		config.Port = "8080"
	}

	if err := config.validate(); err != nil {
		return nil, err
	}

	return config, nil
}

func (c *Config) validate() error {
	required := map[string]string{
		"SLACK_SIGNING_SECRET": c.SlackSigningSecret,
		"SLACK_BOT_TOKEN":      c.SlackBotToken,
		"OPSGENIE_API_KEY":     c.OpsGenieAPIKey,
		"OPSGENIE_TEAM_ID":     c.OpsGenieTeamID,
	}

	var missingVars []string
	for name, value := range required {
		if value == "" {
			missingVars = append(missingVars, name)
		}
	}

	if len(missingVars) > 0 {
		return fmt.Errorf("missing required environment variables: %v", missingVars)
	}

	return nil
}
