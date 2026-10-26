# FriendConnect Coturn TURN Server

Self-hosted TURN server for cross-network WebRTC calls (different ISPs, mobile data, strict NATs).

## Why TURN?
WebRTC P2P calls fail when both peers are behind strict NATs (common on mobile networks). A TURN server relays media traffic so calls work regardless of network topology.

## Installation (Ubuntu)

```bash
sudo ./coturn/install.sh
```

This:
1. Installs Coturn via apt
2. Detects your public IP
3. Generates a TURN secret
4. Configures firewall (ports 3478 TCP/UDP, 5349 TCP, 49152-65535 UDP)
5. Starts the service

After installation, add to FriendConnect `.env`:
```
TURN_SECRET=<generated secret from install output>
TURN_REALM=friendconnect
TURN_SERVERS=turn:YOUR_PUBLIC_IP:3478,turns:YOUR_PUBLIC_IP:5349
```

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 3478 | TCP | TURN TCP listener |
| 3478 | UDP | TURN UDP listener (primary for media) |
| 5349 | TCP | TURNS (TLS) listener |
| 49152-65535 | UDP | Relay ports (media traffic) |

## Firewall

```bash
sudo ./coturn/firewall.sh
```

## Health Check

```bash
./coturn/healthcheck.sh [turn-server-ip]
```

## Generate Test Credentials

```bash
export TURN_SECRET=<your secret>
./coturn/credentials.sh
```

## Security
- **Never hard-code the TURN password** — use `use-auth-secret` + `TURN_SECRET` for time-limited HMAC credentials
- **Block SSRF** — coturn config has `no-loopback-peers` + `no-multicast-peers`
- **Bandwidth limits** — uncomment `bps-capacity` + `total-quota` in turnserver.conf
- **TLS** — generate certificates for turns: (see comments in turnserver.conf)

## Separate Server
If running Coturn on a different server than FriendConnect:
1. Install Coturn on the TURN server
2. Set `TURN_SERVERS=turn:TURN_SERVER_IP:3478` in FriendConnect's `.env`
3. The FriendConnect `/api/webrtc/config` endpoint distributes credentials to clients

## Logs
```bash
tail -f /var/log/turnserver.log
```
