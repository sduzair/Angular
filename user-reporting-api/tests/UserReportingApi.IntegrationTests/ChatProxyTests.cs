using System.IO.Pipelines;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace UserReportingApi.IntegrationTests;

public class ChatProxyTests
{
    [Fact]
    public async Task Chat_ForwardsRequestAndPreservesUpstreamError()
    {
        using var factory = new ChatApplicationFactory(async (request, cancellationToken) =>
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("https://chat-test.example/api/chat?thread=123", request.RequestUri?.ToString());
            Assert.Equal("{\"messages\":[]}", await request.Content!.ReadAsStringAsync(cancellationToken));
            Assert.Equal("application/json", request.Content.Headers.ContentType?.MediaType);
            Assert.Contains(request.Headers.Accept, header => header.MediaType == "application/octet-stream");
            Assert.Null(request.Headers.Authorization);
            return new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new StringContent("rate limited", Encoding.UTF8, "text/plain")
            };
        });
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/octet-stream"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "local-token");

        using var response = await client.PostAsync("/api/chat?thread=123",
            new StringContent("{\"messages\":[]}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("rate limited", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Chat_StreamsFirstChunkBeforeUpstreamCompletes()
    {
        var pipe = new Pipe();
        using var factory = new ChatApplicationFactory((_, _) =>
        {
            var content = new StreamContent(pipe.Reader.AsStream());
            content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = content });
        });
        using var client = factory.CreateClient();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/chat")
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };

        await pipe.Writer.WriteAsync(new byte[] { 0, 255, 1 }, timeout.Token);
        try
        {
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("application/octet-stream", response.Content.Headers.ContentType?.MediaType);
            await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
            var firstChunk = new byte[3];
            await stream.ReadExactlyAsync(firstChunk, timeout.Token);
            Assert.Equal(new byte[] { 0, 255, 1 }, firstChunk);

            await pipe.Writer.WriteAsync(new byte[] { 2, 254 }, timeout.Token);
            await pipe.Writer.CompleteAsync();
            var lastChunk = new byte[2];
            await stream.ReadExactlyAsync(lastChunk, timeout.Token);
            Assert.Equal(new byte[] { 2, 254 }, lastChunk);
            Assert.Equal(0, await stream.ReadAsync(new byte[1], timeout.Token));
        }
        finally
        {
            await pipe.Writer.CompleteAsync();
        }
    }

    [Fact]
    public async Task Chat_ReturnsBadGatewayWhenUpstreamCannotBeReached()
    {
        using var factory = new ChatApplicationFactory((_, _) => throw new HttpRequestException("Unavailable"));
        using var client = factory.CreateClient();

        using var response = await client.PostAsync("/api/chat", new StringContent("{}"));

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    private sealed class ChatApplicationFactory(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> sendAsync)
        : CustomWebApplicationFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?> { ["HashbrownProxy:BaseAddress"] = "https://chat-test.example" }));
            builder.ConfigureLogging(logging => logging.ClearProviders().AddConsole());
            builder.ConfigureServices(services => services.AddHttpClient("HashbrownProxy")
                .ConfigurePrimaryHttpMessageHandler(() => new StubHandler(sendAsync)));
        }
    }

    private sealed class StubHandler(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> sendAsync)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => sendAsync(request, cancellationToken);
    }
}
