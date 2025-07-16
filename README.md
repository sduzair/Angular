# STR Reporting Application

> Note: The project directory and artifact names still use the legacy "user-reporting" naming from a previous iteration. The more accurate name reflecting the current project scope is **str-reporting**.

---

- [STR Reporting Application](#str-reporting-application)
  - [Development Setup](#development-setup)
    - [MongoDB Container](#mongodb-container)
    - [API (Backend)](#api-backend)
    - [App (Frontend)](#app-frontend)
  - [Production Setup](#production-setup)
    - [Environment Variables (`.env`)](#environment-variables-env)
  - [Key Features](#key-features)
    - [Custom Directives (Angular)](#custom-directives-angular)
    - [Database Initialization](#database-initialization)

## Development Setup

### MongoDB Container

1. Build the MongoDB Docker image from the provided `Dockerfile.mongo`:

    ```bash
    docker build -f Dockerfile.mongo -t testmongo .
    ```

2. Run the MongoDB container exposing port 27017:

    ```bash
    docker run --name testmongo -d -p 27017:27017 testmongo
    ```

This container automatically loads mock data and runs the initialization script.

### API (Backend)

1. Navigate to the API directory and run:

    ```bash
    dotnet run
    ```

### App (Frontend)

1. Navigate to the Angular app directory and run:

    ```bash
    pnpm start
    ```

## Production Setup

Use Docker Compose to build and deploy the full stack:

```bash
docker-compose up --build -d
docker-compose down
```

### Environment Variables (`.env`)

```bash
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=examplepassword
MONGO_DATABASE=strTxnDB
MONGO_CONNECTION_STRING=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/${MONGO_DATABASE}?authSource=admin
```

## Key Features

- MongoDB Initialization
  - Preloaded with sample transaction data
  - Automatic schema initialization
- Angular Frontend
  - Edit forms with custom directives
  - Data table components
  - Cross-tab editing prevention
- .NET API
  - Session management
  - STR transaction operations
- Production-Ready
  - Containerized deployment
  - Environment-based configuration

### Custom Directives (Angular)

- `clear-field` - Clears input fields
- `control-toggle` - Toggles form controls
- `transaction-date` - Date formatting
- `transaction-time` - Time formatting

### Database Initialization

The MongoDB container automatically:

- Creates root user from `.env` credentials
- Imports sample data from `data/*.json` files
- Initializes collections through `init.sh`
