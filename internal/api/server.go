package api

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/hcavarsan/slack-opsgenie-bot/internal/handler"
	"github.com/sirupsen/logrus"
)

type Server struct {
	router       *mux.Router
	slackHandler *handler.SlackHandler
	logger       *logrus.Logger
	port         string
}

func NewServer(slackHandler *handler.SlackHandler, logger *logrus.Logger, port string) *Server {
	server := &Server{
		router:       mux.NewRouter(),
		slackHandler: slackHandler,
		logger:       logger,
		port:         port,
	}
	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	s.router.HandleFunc("/slack/commands", s.slackHandler.HandleSlashCommand).Methods("POST")
	s.router.HandleFunc("/slack/interactivity", s.slackHandler.HandleInteractivity).Methods("POST")
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (s *Server) Start() error {
	s.logger.Infof("Starting server on port %s", s.port)
	return http.ListenAndServe(fmt.Sprintf(":%s", s.port), s.router)
}
