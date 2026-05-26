# Fork notes — `podly-new-episodes-feed`

This is a small fork of [podly-pure-podcasts/podly_pure_podcasts](https://github.com/podly-pure-podcasts/podly_pure_podcasts) that adds a cross-feed **Episodes** page.

## What changed

A new page at `/episodes` lists posts from every subscribed feed, newest first, grouped by day. The original homepage (feeds-then-episodes-per-feed) is unchanged.

Five files differ from upstream:

| File | Change |
| --- | --- |
| `src/app/routes/post_routes.py` | Added `GET /api/episodes/recent` (paginated, auth-scoped) |
| `frontend/src/pages/RecentEpisodesPage.tsx` | New page component |
| `frontend/src/types/index.ts` | Added `RecentEpisode` type |
| `frontend/src/services/api.ts` | Added `feedsApi.getRecentEpisodes()` |
| `frontend/src/App.tsx` | New `/episodes` route + "Episodes" nav link |

Keep this diff small. Every additional file is merge-conflict surface area against upstream.

## Building the image

Upstream's `docker-publish.yml` workflow already builds and publishes to GHCR on every push to `main`. **You don't need to write any CI** — the workflow runs in this fork as-is, and publishes to:

```
ghcr.io/<your-gh-account>/podly-pure-podcasts:main-latest
```

Note the image is always named `podly-pure-podcasts` regardless of the repo name — that's baked into the workflow (`IMAGE_NAME: ${{ github.repository_owner }}/podly-pure-podcasts`).

To trigger a build: merge a PR into `main`, or push directly to `main`.

### Make the GHCR package public (recommended)

GHCR packages default to private. After the first build:

1. Go to `https://github.com/<your-account>?tab=packages`
2. Click the `podly-pure-podcasts` package
3. Package settings → Change visibility → Public

Alternative: keep it private and `docker login ghcr.io` on the host before pulling.

## Deploying to an existing Podly host

Edit your existing `compose.yml`:

```diff
-    image: ghcr.io/podly-pure-podcasts/podly-pure-podcasts:${BRANCH:-main-latest}
+    image: ghcr.io/<your-gh-account>/podly-pure-podcasts:${BRANCH:-main-latest}
```

Then:

```bash
docker compose pull
docker compose up -d
```

The `./src/instance` volume (DB, audio cache, logs, config) is unchanged, so your existing data carries over.

## Building locally from source

If you don't want to use GHCR:

```bash
docker compose -f compose.dev.cpu.yml up --build -d
```

(Or `compose.dev.nvidia.yml` / `compose.dev.rocm.yml` for GPU builds.) This builds the image on the host from the working tree.

## Keeping in sync with upstream

The `upstream` remote is set:

```bash
git remote -v
# origin    git@github.com:<you>/podly-new-episodes-feed.git  (your fork)
# upstream  https://github.com/podly-pure-podcasts/podly_pure_podcasts.git
```

To pull in upstream changes:

```bash
git fetch upstream
git checkout main
git merge upstream/main          # or `git rebase upstream/main` for a linear history
git push origin main

git checkout podly-new-episodes-feed
git rebase main                  # bring the feature branch on top of fresh upstream
git push --force-with-lease origin podly-new-episodes-feed
```

If a merge conflict ever lands in one of the five files above, that's where to look first.

## Upstreaming

The diff is small and self-contained. If upstream would accept a PR for the `/episodes` view, that's the best long-term outcome — no fork to maintain.
