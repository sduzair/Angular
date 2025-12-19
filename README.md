# STR Reporting Application

> Note: The project directory and artifact names still use the legacy "user-reporting" naming from a previous iteration. The more accurate name reflecting the current project scope is **str-reporting**.

---

- [STR Reporting Application](#str-reporting-application)
  - [Development Setup](#development-setup)
    - [Environment Variables Dev (`.env`)](#environment-variables-dev-env)
    - [API (Backend) and MongoDB Containers](#api-backend-and-mongodb-containers)
    - [App (Frontend)](#app-frontend)
    - [Mongodb Setup Routines](#mongodb-setup-routines)
  - [Production Setup](#production-setup)
    - [Provisioning MongoDB Atlas Database (`strTxnDB`)](#provisioning-mongodb-atlas-database-strtxndb)
      - [Prerequisites](#prerequisites)
      - [1. Connect to the Database](#1-connect-to-the-database)
      - [2. Import Collections](#2-import-collections)
        - [Import `strTxns` Data](#import-strtxns-data)
    - [TLS Certificate Setup](#tls-certificate-setup)
    - [Certificate Authority Setup (Self-Signed)](#certificate-authority-setup-self-signed)
    - [Build and run Docker containers](#build-and-run-docker-containers)
      - [Manual Test Connection to Local MongoDB Container with TLS](#manual-test-connection-to-local-mongodb-container-with-tls)
    - [Render Dotnetapi Web Service](#render-dotnetapi-web-service)
  - [Key Features](#key-features)
    - [Custom Directives (Angular)](#custom-directives-angular)

## Development Setup

### Environment Variables Dev (`.env`)

```bash
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=examplepassword
MONGO_DATABASE=strTxnDB
MONGO_CONNECTION_STRING=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/${MONGO_DATABASE}?authSource=admin
```

Note: More env variables may be configured in docker compose

### API (Backend) and MongoDB Containers

1. Build and run the api and mongodb containers

    ```bash
    docker-compose up --build -d
    ```

This container automatically runs the initialization script to load mock data.

### App (Frontend)

1. Navigate to the Angular app directory and run:

    ```bash
    pnpm start
    ```

The angular dev server is configured to proxy requests to the api

### Mongodb Setup Routines

- Connect to db

    ```bash
    mongosh "mongodb://root:examplepassword@localhost:27018/strTxnDB?authSource=admin"
    ```

- Reset test session

    ```bash
    db.sessions.updateOne({ UserId: 'test-user' }, { $set: { Version: 0, data: {} } })
    ```

## Production Setup

### Provisioning MongoDB Atlas Database (`strTxnDB`)

#### Prerequisites

- MongoDB Atlas cluster created and accessible.
- Configure MongoDB Atlas to use your certificate authority to issue/verify certificates
- X.509 client certificate (`./certs/client.pem`) provisioned and mapped to a MongoDB `$external` user with at least `readWrite` on `strTxnDB`.
- [MongoDB Shell (`mongosh`)](https://www.mongodb.com/try/download/shell) and [mongoimport tool](https://www.mongodb.com/docs/database-tools/installation/) installed.

---

#### 1. Connect to the Database

```bash
mongosh "mongodb+srv://sandbox.tuank.mongodb.net/strTxnDB?authSource=%24external&authMechanism=MONGODB-X509" --apiVersion 1 --tls --tlsCertificateKeyFile .\certs\client.pem
```

#### 2. Import Collections

##### Import `strTxns` Data

```bash
mongoimport --uri "mongodb+srv://sandbox.tuank.mongodb.net/strTxnDB"
--authenticationDatabase="$external" --authenticationMechanism=MONGODB-X509
--ssl --sslPEMKeyFile=./certs/client.pem
--collection strTxns --file data/MOCK_DATA_cashDepositComplete.json
--jsonArray
```

```bash
mongoimport --uri "mongodb+srv://sandbox.tuank.mongodb.net/strTxnDB"
--authenticationDatabase="$external" --authenticationMechanism=MONGODB-X509
--ssl --sslPEMKeyFile=./certs/client.pem
--collection strTxns --file data/MOCK_DATA_cashWithdrawalComplete.json
--jsonArray
```

### TLS Certificate Setup

Before running the production containers, you need to generate and configure TLS certificates:

1. **Generate Server (mongodb) Certificate**

    ```bash
    openssl genrsa -out server.key 4096

    openssl req -new -key server.key -out server.csr -config ./server.cnf -extensions req_ext

    openssl x509 -req -in server.csr -CA certs/ca.pem -CAkey certs/ca.key -CAcreateserial -out server.crt -days 365 -extfile ./server.cnf -extensions req_ext

    cat server.crt server.key > mongodb.pem

    mv mongodb.pem certs/
    ```

2. **Generate Client (dotnetapi) Certificate**

    ```bash
    openssl genrsa -out client.key 4096

    openssl req -new -key client.key -out client.csr -config ./client.cnf -extensions req_ext

    openssl x509 -req -in ./client.csr -CA ./certs/ca.pem -CAkey ./certs/ca.key -CAcreateserial -out client.crt -days 365 -extfile ./client.cnf -extensions req_ext

    cat client.key client.crt > client.pem

    mv client.pem certs/
    ```

These certificate files are used to enable TLS in MongoDB and secure client-server communication.

### Certificate Authority Setup (Self-Signed)

A Certificate Authority (CA) is required to sign/verify server and client certificates. Production deployments should use a dedicated CA.

1. Generate CA Private Key

    ```bash
    openssl genrsa -out ca.key 4096

    mv ca.key certs/
    ```

2. Generate CA Certificate

    ```bash
    openssl req -x509 -new -key ca.key -out ca.pem -days 3650 -subj "/CN=MongoRootCA"

    mv ca.pem certs/
    ```

### Build and run Docker containers

Use Docker Compose to build and deploy the full stack:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

#### Manual Test Connection to Local MongoDB Container with TLS

You can manually verify the MongoDB TLS setup using mongosh:

```bash
mongosh strTxnDB --tls \
--tlsCertificateKeyFile certs/client.pem \
--tlsCAFile certs/ca.pem \
--host localhost --port 27018 \
-u root -p examplepassword \
--authenticationDatabase admin
```

### Render Dotnetapi Web Service

- ENV Variables

    ```bash
    MONGO_ROOT_USERNAME=sandbox.tuank.mongodb.net
    MONGO_DATABASE=strTxnDB
    MONGO_CONNECTION_STRING=mongodb+srv://${MONGO_ROOT_USERNAME}/${MONGO_DATABASE}?authSource=%24external&authMechanism=MONGODB-X509
    CLIENT_PEM_BASE64=asdf=
    ```

- Pass your client PEM certificate as a base64-encoded environment variable (CLIENT_PEM_BASE64) into the Docker container.

    ```bash
    base64 certs/client.pem | tr -d '\n' > certs/client.pem.base64
    ```

- The container's entrypoint.sh script will:
  - Decode the base64 string.
  - Write the PEM file to /etc/ssl/client.pem during container startup.
  - Apply strict file permissions (chmod 600) to enhance security.

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
