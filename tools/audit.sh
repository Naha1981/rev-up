#!/bin/bash
B=https://revup.nahalabs.co.za
W=8fab8322-cb69-4723-99da-90a66dc7fa07
J="${TMPDIR:-/tmp}/audit-jar.txt"
rm -f $J
# login
curl -s -c $J $B/accounts/login/ -o /tmp/login.html
CSRF=$(grep -o 'csrfmiddlewaretoken" value="[^"]*"' /tmp/login.html | head -1 | cut -d'"' -f4)
curl -s -b $J -c $J -e $B/accounts/login/ -d "csrfmiddlewaretoken=$CSRF&login=${REVUP_AUDIT_EMAIL:?Set REVUP_AUDIT_PASSWORD and REVUP_AUDIT_EMAIL}&password=${REVUP_AUDIT_PASSWORD}" -o /dev/null -w "LOGIN:%{http_code} -> %{redirect_url}\n" $B/accounts/login/
for u in "/" "/accounts/login/" "/accounts/signup/" "/legal/terms/" "/legal/privacy/" \
 "/organizations/" "/workspaces/" "/members/" "/settings/" "/social-accounts/" \
 "/workspace/$W/" "/workspace/$W/create/" "/workspace/$W/ideas/board/" \
 "/workspace/$W/radar/" "/workspace/$W/responder/" \
 "/workspace/$W/receptionist/" "/workspace/$W/receptionist/setup/" "/workspace/$W/receptionist/bookings/" "/workspace/$W/receptionist/quotes/" "/workspace/$W/receptionist/reviews/" \
 "/workspace/$W/calendar/" "/workspace/$W/calendar/posting-slots/" "/workspace/$W/calendar/queues/" \
 "/workspace/$W/inbox/" "/workspace/$W/inbox/saved-replies/" \
 "/workspace/$W/analytics/" "/workspace/$W/media/" "/workspace/$W/settings/clients/"; do
  out=$(curl -s -b $J -c $J -o /tmp/page.html -w '%{http_code} %{url_effective}' -L -m 20 "$B$u")
  sz=$(wc -c < /tmp/page.html)
  err=$(grep -c -i "traceback\|Internal Server Error\|TemplateSyntaxError\|Something went wrong" /tmp/page.html)
  echo "$out size=$sz errmark=$err $u"
done
