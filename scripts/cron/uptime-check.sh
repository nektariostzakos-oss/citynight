#!/bin/bash
# Uptime sentinel. Runs every 5 minutes (suggested cron line at bottom).
# Fails if any of the key URLs return non-2xx. On first failure of a window,
# emails ALERT_EMAIL via curl→Resend so the on-call gets paged before
# something a real visitor notices.
#
# Stateless: doesn't track previous results. The cron re-runs every 5 min,
# so a sustained outage produces one email every 5 min — acceptable for now.
# If we add Redis later we can debounce.
#
# Required env (set globally in Hostinger crontab or hPanel):
#   SITE_URL          eg. https://citynight.gr
#   EMAIL_API_KEY     Resend key (same one lib/email.ts uses)
#   ALERT_EMAIL       inbox that should get paged
# Optional:
#   EMAIL_FROM        defaults to 'citynight.gr <noreply@citynight.gr>'

set -u

: "${SITE_URL:=https://citynight.gr}"
: "${EMAIL_FROM:=citynight.gr <noreply@citynight.gr>}"

URLS=(
  "$SITE_URL/"
  "$SITE_URL/el"
  "$SITE_URL/el/greece"
  "$SITE_URL/sitemap.xml"
  "$SITE_URL/robots.txt"
)

failures=()
for url in "${URLS[@]}"; do
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [[ "$http_code" != 2* && "$http_code" != 3* ]]; then
    failures+=("$url → HTTP $http_code")
  fi
done

if [[ ${#failures[@]} -eq 0 ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [uptime] all green (${#URLS[@]} urls)"
  exit 0
fi

# Build the alert body.
body="citynight.gr uptime check failed.\n\nFailures (${#failures[@]}/${#URLS[@]}):\n"
for f in "${failures[@]}"; do
  body+=" - $f\n"
done

echo -e "$body"

# Email it if we can.
if [[ -n "${EMAIL_API_KEY:-}" && -n "${ALERT_EMAIL:-}" ]]; then
  payload=$(cat <<EOF
{
  "from": "$EMAIL_FROM",
  "to": "$ALERT_EMAIL",
  "subject": "[citynight] uptime check failed: ${#failures[@]}/${#URLS[@]}",
  "text": $(printf '%s' "$body" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
}
EOF
)
  curl -s -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer $EMAIL_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null
fi

exit 1

# Crontab line (every 5 minutes):
#   */5 * * * *  SITE_URL=https://citynight.gr EMAIL_API_KEY=... ALERT_EMAIL=ops@citynight.gr \
#       /home/uXXX/domains/citynight.gr/public_html/scripts/cron/uptime-check.sh >> ~/logs/uptime.log 2>&1
