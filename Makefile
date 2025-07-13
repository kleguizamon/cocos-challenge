.PHONY: install build run dev db-up db-migrate db-seed db-seed-local clean

install:
	npm install

build:
	npm run build

run:
	docker compose up --build

dev:
	npm run start:dev

db-up:
	docker compose up postgres -d

# Execute migrations in Docker
db-migrate:
	docker compose exec api npm run typeorm:run-migrations

# Seed in Docker
db-seed:
	docker compose exec api npm run seed

# Seed local (for development)
db-seed-local:
	npm run seed

# View database logs
db-logs:
	docker compose logs -f postgres

# Access the database
db-shell:
	docker compose exec postgres psql -U neondb_owner -d neondb

# Clean all containers and volumes
clean:
	docker compose down -v 