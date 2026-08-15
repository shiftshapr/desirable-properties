# Kickoff meeting audio

The ~12MB MP3 is **not** stored in git.

- Public URL: `/media/meta-layer-initiative-kickoff.mp3`
- Source on this VPS: `/home/ubuntu/meta-console/agent-drop/Meta-Layer_Initiative_Kickoff.Audio.mp3`
- Agent-drop UUID: `413987de-4535-47bb-8627-358d9d33405c`

```bash
mkdir -p challenge-site/public/media
cp /home/ubuntu/meta-console/agent-drop/Meta-Layer_Initiative_Kickoff.Audio.mp3 \
  challenge-site/public/media/meta-layer-initiative-kickoff.mp3
```

Nginx may also alias `/media/` to this directory (see `challenge-site/nginx/desirableproperties.org.conf`) so seeking does not go through Node.
