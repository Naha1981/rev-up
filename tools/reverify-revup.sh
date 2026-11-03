#!/bin/bash
# Post-deploy re-verification of the RevUp SaaS acceptance journey (runs after fae73c1 deploys).
set -e
B=https://revup.nahalabs.co.za
TS=$(date +%H%M%S)
rm -f /tmp/jarC.txt
CSRF=$(curl -s -c /tmp/jarC.txt --max-time 90 $B/accounts/signup/ | grep -o 'name="csrfmiddlewaretoken" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"//')
curl -s -b /tmp/jarC.txt -c /tmp/jarC.txt --max-time 90 -o /tmp/c-signup.html -w 'signup_final=%{url_effective} code=%{http_code}\n' -L \
  -e $B/accounts/signup/ -d "csrfmiddlewaretoken=$CSRF" \
  --data-urlencode "email=nahalabs+revup-test-c-$TS@gmail.com" \
  --data-urlencode "password1=${REVUP_TEST_PASSWORD:?Set REVUP_TEST_PASSWORD}" -d "industry=general" $B/accounts/signup/
WS=$(grep -o 'workspace/[0-9a-f-]\{36\}' /tmp/c-signup.html | head -1 | cut -d/ -f2)
echo "workspace=$WS"
# 1. Board must have NO seeded card and must show a pre-first-visit idea
CSRF2=$(grep csrftoken /tmp/jarC.txt | awk '{print $NF}')
curl -s -b /tmp/jarC.txt -c /tmp/jarC.txt --max-time 60 -o /dev/null -w 'idea_create=%{http_code}\n' \
  -H "X-CSRFToken: $CSRF2" -H 'HX-Request: true' -H "Referer: $B/workspace/$WS/calendar/" \
  --data-urlencode "title=Reverify idea $TS" --data-urlencode "description=x" -d "tags=" \
  "$B/workspace/$WS/ideas/create/"
curl -s -b /tmp/jarC.txt --max-time 60 -H 'HX-Request: true' "$B/workspace/$WS/ideas/board/" -o /tmp/c-board.html -w 'board=%{http_code}\n'
echo "seeded_card_count=$(grep -c 'place to plan' /tmp/c-board.html || true) (want 0)"
echo "idea_visible=$(grep -c "Reverify idea $TS" /tmp/c-board.html || true) (want >=1)"
echo "empty_hint=$(grep -c 'No ideas yet' /tmp/c-board.html || true)"
