# Drafts

Place post, reply, and short-video script drafts here for bots to pick up.

## Typefully auto-scheduling

Put ready-to-schedule posts in:

- `shared/drafts/ready/*.md` — simple posts or threads (split posts with a line containing only `---`)
- `shared/drafts/ready/*.json` — full Typefully API payload

After the GitHub Action runs successfully, processed files are moved to `shared/drafts/processed/YYYY-MM-DD/`.

### Markdown example (X thread)

```markdown
First tweet of the thread.

---

Second tweet with more details.

---

Final tweet + CTA.
```

### Setup required (one-time)

1. In the GitHub repo go to **Settings → Secrets and variables → Actions**
2. Add a secret named `TYPEFULLY_API_KEY` with your Typefully API key.
3. (Optional) Add `TYPEFULLY_SOCIAL_SET_ID` if you have multiple social sets.

The workflow `.github/workflows/typefully-schedule.yml` runs daily at 09:00 UTC and can also be triggered manually from the Actions tab.

**Do not commit the API key.**
