using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

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
                ["MongoDB:DatabaseName"] = "userAppDB_test_" + Guid.NewGuid().ToString("N"),
            };
            configBuilder.AddInMemoryCollection(testSettings.ToList());
        });
    }
}