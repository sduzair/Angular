# -------- Angular build stage --------
ARG NODE_VERSION=22.13.0-slim

FROM node:${NODE_VERSION} AS angular-build

# Install pnpm globally and set up environment paths
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.8.0

WORKDIR /app

# Copy Angular app files from user-reporting-app relative path
COPY user-reporting-app/package.json user-reporting-app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy all Angular source files
COPY user-reporting-app ./

# Build Angular app (assumes the build output is set correctly angular.json)
RUN pnpm run build

# -------- .NET API build stages --------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS dotnet-build
ARG configuration=Release

WORKDIR /src

# Copy csproj and restore dependencies
COPY ["user-reporting-api/src/UserReportingApi/UserReportingApi.csproj", "src/UserReportingApi/"]
RUN dotnet restore "src/UserReportingApi/UserReportingApi.csproj"

# Copy all API source files
COPY user-reporting-api .

WORKDIR "/src/src/UserReportingApi"
RUN dotnet build "UserReportingApi.csproj" -c $configuration -o /app/build

FROM dotnet-build AS publish
ARG configuration=Release
RUN dotnet publish "UserReportingApi.csproj" -c $configuration -o /app/publish /p:UseAppHost=false

# -------- Final runtime image --------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 5110

ENV ASPNETCORE_URLS=http://+:5110

# Copy API publish output
COPY --from=publish /app/publish .

# Copy Angular dist output from build stage to wwwroot (adjust path to build output folder)
COPY --from=angular-build /app/dist/browser /app/wwwroot

USER app

ENTRYPOINT ["dotnet", "UserReportingApi.dll"]