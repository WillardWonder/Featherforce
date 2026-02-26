# Feather Force (Bluejay & Cardinal)

A polished retro-style co-op shooter inspired by Contra energy, with two bird heroes:
- **Bluejay**
- **Cardinal**

## Features
- Retro side-shooter feel (canvas)
- 2-player online co-op (host/join room)
- Host-authoritative enemy simulation
- Synced player movement/shooting over WebRTC (PeerJS)
- GitHub Pages friendly (static)

## Play
- Open site
- Pick character
- Host enters room code and clicks **Host**
- Friend enters same code and clicks **Join**
- Controls: `WASD` or arrows to move, `J` or space to fire

## Notes
- Multiplayer uses PeerJS cloud signaling for initial connection.
- Host drives enemy simulation and score.
