.PHONY: db_test_up db_test_down

DC_FILE = test-db/docker-compose.yml

db_test_up:
	docker compose -f $(DC_FILE) up -d

db_test_down:
	docker compose -f $(DC_FILE) down
