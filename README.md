# Poacher UI - STR Reporting Application

- [Poacher UI - STR Reporting Application](#poacher-ui---str-reporting-application)
  - [Development Setup](#development-setup)
    - [MongoDB Container](#mongodb-container)
    - [API (Backend)](#api-backend)
    - [Web App (Frontend)](#web-app-frontend)
  - [Provisioning MongoDB Atlas Database (`amldb`)](#provisioning-mongodb-atlas-database-amldb)
    - [Prerequisites](#prerequisites)
    - [1. Connect to the Database](#1-connect-to-the-database)
    - [2. Import Collections](#2-import-collections)
  - [Certificate Authority Setup (Self-Signed)](#certificate-authority-setup-self-signed)
  - [TLS Certificate Setup](#tls-certificate-setup)
    - [Access token generation](#access-token-generation)
    - [Render Dotnetapi Web Service](#render-dotnetapi-web-service)

## Development Setup

### MongoDB Container

```bash
# Seed and run the mongodb container
docker compose up -d mongodb-seed
# docker compose down -v

# Connect to db
mongosh "mongodb://localhost:27017/amldb?directConnection=true"
```

### API (Backend)

```bash
# Navigate to the api folder and run
dotnet run
```

> The dotnet api is configured to connect with monogdb container

### Web App (Frontend)

```bash
# Navigate to the app folder and run
pnpm start
```

> The angular dev server is configured to proxy requests to the api

## Provisioning MongoDB Atlas Database (`amldb`)

### Prerequisites

- MongoDB Atlas cluster created and accessible.
- Configure MongoDB Atlas to use your certificate authority to issue/verify certificates
- X.509 client certificate (`./certs/client.pem`) provisioned and mapped to a MongoDB `$external` user with roles `dbAdmin@amldb` and `readWrite@amldb`
- [MongoDB Shell (`mongosh`)](https://www.mongodb.com/try/download/shell) and [mongoimport tool](https://www.mongodb.com/docs/database-tools/installation/) installed.

---

### 1. Connect to the Database

```bash
mongosh "mongodb+srv://sandbox.tuank.mongodb.net/amldb?authSource=%24external&authMechanism=MONGODB-X509" --apiVersion 1 --tls --tlsCertificateKeyFile .\certs\client.pem
```

### 2. Import Collections

```bash
# creates a data dump from mongodb container
docker exec mongodb mongodump --uri="mongodb://mongodb:27017/?replicaSet=rs0" --db=amldb --out=/dump

# copy to local directory
docker cp mongodb:/dump/amldb ./dump

# imports data
mongorestore `
  --uri "mongodb+srv://sandbox.tuank.mongodb.net/amldb?authSource=%24external&authMechanism=MONGODB-X509" `
  --ssl `
  --sslPEMKeyFile=./certs/client.pem `
  --nsInclude="amldb.*" `
  .\dump
```

## Certificate Authority Setup (Self-Signed)

A Certificate Authority (CA) is required to sign/verify server and client certificates. Production deployments should use a dedicated CA.

1. Generate CA Private Key

    ```bash
    openssl genrsa -out certs/ca.key 4096
    ```

2. Generate CA Certificate

    ```bash
    openssl req -x509 -new -key certs/ca.key -out certs/ca.pem -days 3650 -subj "/CN=MongoRootCA"
    ```

## TLS Certificate Setup

Before running the production containers, you need to generate and configure TLS certificates:

1. **Generate Server (mongodb) Certificate**

    ```bash
    openssl genrsa -out certs/server.key 4096

    openssl req -new -key certs/server.key -out certs/server.csr -config certs/server.cnf -extensions req_ext

    openssl x509 -req -in certs/server.csr -CA certs/ca.pem -CAkey certs/ca.key -CAcreateserial -out certs/server.crt -days 365 -extfile certs/server.cnf -extensions req_ext

    cat certs/server.crt certs/server.key > certs/server.pem
    ```

2. **Generate Client (mongo-shell-user) Certificate**

    ```bash
    openssl genrsa -out certs/client.key 4096

    openssl req -new -key certs/client.key -out certs/client.csr -config certs/client.cnf

    openssl x509 -req -in certs/client.csr -CA ./certs/ca.pem -CAkey ./certs/ca.key -CAcreateserial -out certs/client.crt -days 365 -extfile certs/client.cnf -extensions req_ext

    cat certs/client.key certs/client.crt > certs/client.pem
    ```

These certificate files are used to enable TLS in MongoDB and secure client-server communication.

### Access token generation

```sh
# analyst
dotnet user-jwts create --role analyst --name analyst-user --expires-on 2099-12-31

# inv
dotnet user-jwts create --role inv --name inv-user --expires-on 2099-12-31

# admin
dotnet user-jwts create --role admin --name admin-user --expires-on 2099-12-31

# list
dotnet user-jwts list
```

### Render Dotnetapi Web Service

- Configure env variables

```bash
MONGO_ROOT_USERNAME=sandbox.tuank.mongodb.net
MONGO_DATABASE=amldb
MONGO_CONNECTION_STRING=mongodb+srv://${MONGO_ROOT_USERNAME}/${MONGO_DATABASE}?authSource=%24external&authMechanism=MONGODB-X509
ASPNETCORE_ENVIRONMENT=Production
CLIENT_PEM_BASE64="********"
Jwt__Key="*******************************************="
MongoDB__CLIENT_CERT_PATH=/etc/ssl/client.pem
MongoDB__ConnectionString="mongodb+srv://sandbox.tuank.mongodb.net/amldb?authSource=%24external&authMechanism=MONGODB-X509"
MongoDB__DatabaseName=amldb
```

- Pass client PEM certificate as a base64-encoded environment variable (CLIENT_PEM_BASE64)

```bash
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certs/ca.pem"))
# base64 certs/client.pem | tr -d '\n' > certs/client.pem.base64
```

- The container's entrypoint.sh script will:
  - Decode the base64 string.
  - Write the PEM file to /etc/ssl/client.pem during container startup.
  - Apply strict file permissions (chmod 600) to enhance security.

- Trigger deploments

```bash
docker-compose -f .\docker-compose.prod.yml build  --progress=plain dotnetapi

docker tag angular-dotnetapi:latest sduzair/str-angular-dotnetapi:latest

docker push sduzair/str-angular-dotnetapi

curl https://api.render.com/deploy/srv-d1udhumr433s73ektcm0?key=***********
```
