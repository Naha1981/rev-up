#!/bin/bash
# One-off PayFast sandbox checkout helper for a RevUp Growth subscription.
# Required env: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_SIGNATURE
# (signature must be computed for the exact parameter set below).
: "${PAYFAST_MERCHANT_ID:?}" "${PAYFAST_MERCHANT_KEY:?}" "${PAYFAST_SIGNATURE:?}"
curl -s -c "${TMPDIR:-/tmp}/pfj.txt" -b "${TMPDIR:-/tmp}/pfj.txt" \
  --data-urlencode "merchant_id=$PAYFAST_MERCHANT_ID" \
  --data-urlencode "merchant_key=$PAYFAST_MERCHANT_KEY" \
  --data-urlencode "return_url=https://revup.nahalabs.co.za/billing/payfast/return/" \
  --data-urlencode "cancel_url=https://revup.nahalabs.co.za/billing/payfast/cancel/" \
  --data-urlencode "notify_url=https://revup.nahalabs.co.za/billing/payfast/notify/" \
  --data-urlencode "m_payment_id=${PAYFAST_PAYMENT_ID:?}" \
  --data-urlencode "amount=999.00" \
  --data-urlencode "item_name=RevUp Growth (monthly)" \
  --data-urlencode "subscription_type=1" \
  --data-urlencode "recurring_amount=999.00" \
  --data-urlencode "frequency=3" \
  --data-urlencode "cycles=0" \
  --data-urlencode "signature=$PAYFAST_SIGNATURE" \
  https://sandbox.payfast.co.za/eng/process -o "${TMPDIR:-/tmp}/pf_resp.html" -w '%{http_code} %{redirect_url}\n'
