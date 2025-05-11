# User Reporting API - .NET Core Minimal API with MongoDB

A lightweight user reporting API built with .NET Core Minimal API and MongoDB for data storage.

## Features

- User management endpoints
- Session tracking with optimistic concurrency control
- MongoDB integration
- Environment-based configuration
- Comprehensive logging

## Prerequisites

- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Set up environment variables**

   In PowerShell (Windows):

   ```powershell
   $env:MongoDB__ConnectionString = "mongodb://localhost:27017"
   $env:MongoDB__DatabaseName = "userAppDB"
   ```

3. **Run the application**

   ```bash
   dotnet run
   ```

## Database Structure

The API expects the following collections in MongoDB:

- `users` - Stores user information
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
2. Check the connection string in your environment variables
3. Review application logs for detailed error information

## License

[MIT License](LICENSE)
