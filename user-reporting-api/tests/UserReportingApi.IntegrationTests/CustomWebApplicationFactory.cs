using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace UserReportingApi.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, configBuilder) =>
        {
            // Override configuration for tests
            var testSettings = new Dictionary<string, string?>
            {
                // Use a unique test database name
                ["MongoDB:DatabaseName"] = "amldb_test_" + Guid.NewGuid().ToString("N"),
                ["Jwt:Key"] = "irrelevantkey",
            };
            configBuilder.AddInMemoryCollection([.. testSettings]);
        });

        builder.ConfigureServices(services =>
      {
          // Remove the real JWT bearer scheme registered in Program.cs
          services
              .AddAuthentication(TestAuthHandler.SchemeName)
              .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                  TestAuthHandler.SchemeName, _ => { });
      });
    }
}

/// <summary>
/// RequireAuthorization policies pass in integration tests.
/// </summary>
public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "TestUser"),
            new Claim(ClaimTypes.Role, "admin"),
            new Claim(ClaimTypes.Role, "inv"),
            new Claim(ClaimTypes.Role, "analyst"),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}