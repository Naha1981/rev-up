#!/bin/bash
cd /tmp
BASE=https://revup.nahalabs.co.za
login_user() {
  n=$1; line=$((n+1))
  U=$(sed -n "${line}p" synthetic_load_users.tsv | cut -f1)
  P=$(sed -n "${line}p" synthetic_load_users.tsv | cut -f2)
  J="jar-sess-$n.txt"
  curl -s -c "$J" -o /dev/null "$BASE/accounts/login/"
  C=$(grep csrftoken "$J" | awk '{print $NF}')
  curl -s -b "$J" -c "$J" -o /dev/null -w "user$n: %{http_code} %{time_total}s\n" -X POST "$BASE/accounts/login/" -H "Referer: $BASE/accounts/login/" --data-urlencode "csrfmiddlewaretoken=$C" --data-urlencode "login=$U" --data-urlencode "password=$P"
}
# users already logged in this run: 1,3-10 -> skip; do the rest paced 10/min
TODO="2 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50"
i=0
for n in $TODO; do
  login_user $n
  i=$((i+1))
  if [ $((i % 9)) -eq 0 ]; then echo "--- pacing sleep $(date +%T) ---"; sleep 62; fi
done
echo "ALL_SESSIONS_DONE $(date +%T)"
