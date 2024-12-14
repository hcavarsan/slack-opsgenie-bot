package model

type AlertPriority string

const (
	PriorityP1 AlertPriority = "P1"
	PriorityP2 AlertPriority = "P2"
	PriorityP3 AlertPriority = "P3"
	PriorityP4 AlertPriority = "P4"
)

type Alert struct {
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Priority    AlertPriority `json:"priority"`
	Source      string        `json:"source"`
	Tags        []string      `json:"tags"`
	Reporter    Reporter      `json:"reporter"`
	Team        Team          `json:"team"`
}

type Reporter struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
}

type Team struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type AlertCreationResult struct {
	ID        string        `json:"id"`
	Title     string        `json:"title"`
	Alias     string        `json:"alias"`
	Priority  AlertPriority `json:"priority"`
	URL       string        `json:"url"`
	RequestID string        `json:"requestId"`
}

type AlertResponse struct {
	RequestId string  `json:"requestId"`
	Result    string  `json:"result"`
	Took      float64 `json:"took"`
	Message   string  `json:"message"`
	AlertId   string  `json:"alertId"`
}
