# Basket

Personal inflation calculator. Enter your monthly spending by category and it reweights official BLS CPI series into your personal 12-month inflation rate, rendered as a live receipt.

Your rate = sum(spend_i × pct_i) / sum(spend_i), using category-level 12-month changes. The gap vs headline CPI-U shows how far your basket drifts from the average household's weights.

## Data

index.html ships with an approximate snapshot (labeled in the UI). Before deploying, pull real numbers:

    node update-data.mjs

Writes data.json from the BLS public API (12 CPI series + headline). The page loads data.json if present and falls back to the snapshot if not. Verify the series IDs in update-data.mjs against bls.gov once; a couple of the sub-index IDs should be double-checked. Unregistered API use is capped at 25 req/day; set BLS_API_KEY after registering for more.

Deploy: run the update script, then push the folder to Cloudflare Pages. Optionally rerun via cron/CI monthly after each CPI release.
