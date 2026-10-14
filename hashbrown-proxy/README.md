# Hashbrown Proxy

Express API that forwards Hashbrown chat requests to OpenAI and streams responses. Listens on port `3000` by default (`PORT` overrides it).

## Docker

Build and publish from the project directory:

```sh
docker build -t sduzair/hashbrown-proxy:latest .
docker login
docker push sduzair/hashbrown-proxy:latest
```

Pull and run (set `OPENAI_API_KEY` in your shell first):

```sh
docker pull sduzair/hashbrown-proxy:latest
docker run --rm -p 3000:3000 -e OPENAI_API_KEY sduzair/hashbrown-proxy:latest
```

## API

| Endpoint | Description |
| --- | --- |
| `GET /health` | Returns `200` with `{"status":"ok"}`. |
| `POST /api/chat` | Accepts a Hashbrown chat request as JSON (up to 1 MB), forwards it through `HashbrownOpenAI.stream.text`, and streams the response as `application/octet-stream`. Uses the server's `OPENAI_API_KEY`. |

Check the running container:

```sh
curl http://localhost:3000/health
```
