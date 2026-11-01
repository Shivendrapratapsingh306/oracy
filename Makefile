.PHONY: db-up db-down backend-dev backend-test

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

backend-dev:
	cd backend && uvicorn app.main:app --reload --port 8000

backend-test:
	cd backend && python -m pytest
