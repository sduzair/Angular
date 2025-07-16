# STR Txn Reporting API - .NET Core Minimal API with MongoDB

A lightweight user reporting API built with .NET Core Minimal API and MongoDB for data storage.

- [STR Txn Reporting API - .NET Core Minimal API with MongoDB](#str-txn-reporting-api---net-core-minimal-api-with-mongodb)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Dev Setup Instructions](#dev-setup-instructions)
  - [Database Structure](#database-structure)
  - [Tests](#tests)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)

## Features

- User management endpoints
- Session tracking with optimistic concurrency control
- MongoDB integration
- Environment-based configuration
- Comprehensive logging

## Prerequisites

- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally (see root readme)

## Dev Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Ensure empty wwwroot dir exists**

   ```bash
   mkdir wwwroot
   ```

3. **Set up environment variables (optional)**

   In PowerShell (Windows):

   ```powershell
   $env:MongoDB__ConnectionString = "mongodb://localhost:27017"
   $env:MongoDB__DatabaseName = "strTxnDB"
   ```

4. **Run the application**

   ```bash
   dotnet run
   ```

## Database Structure

The API expects the following collections in MongoDB:

- `strTxns` - Stores str txn information
- `sessions` - Stores session data with version tracking

## Tests

For test coverage open the html report file in browser after run the following commands:

```bash
dotnet test --collect:"XPlat Code Coverage"
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:.\TestResults\<guid>\coverage.cobertura.xml -targetdir:"coveragereport" -reporttypes:Html
```

## Troubleshooting

If you encounter connection issues:

1. Verify MongoDB is running locally
2. Check the connection string
3. Review application logs for detailed error information

## License

[MIT License](LICENSE)
