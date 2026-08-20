# Public media (not in git for large binaries)

## Kickoff meeting audio

The ~12MB MP3 is **not** stored in git.

- Public URL: `/media/meta-layer-initiative-kickoff.mp3`
- Source on this VPS: `/home/ubuntu/meta-console/agent-drop/Meta-Layer_Initiative_Kickoff.Audio.mp3`
- Agent-drop UUID: `413987de-4535-47bb-8627-358d9d33405c`

```bash
mkdir -p challenge-site/public/media
cp /home/ubuntu/meta-console/agent-drop/Meta-Layer_Initiative_Kickoff.Audio.mp3 \
  challenge-site/public/media/meta-layer-initiative-kickoff.mp3
```

## PLA / DP Studio hero (Be part of 1.0)

- Public URL: `/media/be-part-of-1.0-hero.png`
- Source: `/home/ubuntu/meta-console/agent-drop/7._Be_part_of_1.0-2.png`
- Agent-drop UUID: `ee393e27-b4de-473e-b8f2-9037d80b795e`

```bash
cp /home/ubuntu/meta-console/agent-drop/7._Be_part_of_1.0-2.png \
  challenge-site/public/media/be-part-of-1.0-hero.png
```

Nginx may also alias `/media/` to this directory (see `challenge-site/nginx/desirableproperties.org.conf`) so seeking does not go through Node.
