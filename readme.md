# Built with Assistance from

[ChatGPT](https://chatgpt.com/c/f688999a-9e1d-4d18-9c6e-397a6fb355a8)

[Public Chat Link](https://chatgpt.com/share/bd8fba84-aaf0-4088-8bf0-8e2c4a9807fb)

# GPT Custom Server

This project sets up a server to interact with a custom GPT instance, allowing it to read from and write to files, and run Jest tests programmatically.

## Prerequisites

- Docker
- ngrok account

## Getting Started

1. Clone the repository:

```bash
git clone <repository-url>
cd project
```

2. Create a .env file with your ngrok token and subdomain (if applicable):

```
echo "NGROK_AUTHTOKEN=your_ngrok_authtoken" > .env
echo "NGROK_SUBDOMAIN=your_subdomain" >> .env
```

3. Build and start the Docker containers using Docker Compose:

```
docker-compose up --build
```

4. The server should now be running on http://localhost:3000 and exposed via ngrok. If you set a subdomain, the public URL will be https://your_subdomain.ngrok.io. Otherwise, check the ngrok dashboard or logs to get the public URL.

## Ngrok Configuration

The ngrok service is configured in the `docker-compose.yaml` file. Here is the relevant configuration:

```yaml
ngrok:
  image: ngrok/ngrok:latest
  command: http server:3000 --authtoken ${NGROK_AUTH} --subdomain ${NGROK_DOMAIN}
  restart: unless-stopped
  ports:
    - "4040:4040"
  depends_on:
    - server
```

### Environment Variables:
- `NGROK_AUTH`: Your ngrok authentication token.
- `NGROK_DOMAIN`: Your desired subdomain for the ngrok tunnel.

### Usage:
1. Ensure `NGROK_AUTH` and `NGROK_DOMAIN` are set in your environment.
2. Run `./start.sh /path/to/project` to start the services, including ngrok.

The ngrok tunnel will forward traffic to the `server` service running on port 3000 and expose the ngrok web interface on port 4040.

