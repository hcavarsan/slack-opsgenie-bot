.PHONY: build run deploy-cloud-function docker-up docker-down

build:
	go build -o bin/bot cmd/bot/main.go

run:
	go run cmd/bot/main.go

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down


deploy-cloud-function:
	gcloud functions deploy slack-opsgenie-bot \
		--gen2 \
		--runtime=go123 \
		--region=us-central1 \
		--source=. \
		--entry-point=SlackOpsGenieBot \
		--trigger-http \
		--allow-unauthenticated \
		--env-vars-file=.env.yaml

docker-run:
	docker build -t slack-opsgenie-bot .
	docker run -p 8080:8080 --env-file .env slack-opsgenie-bot

