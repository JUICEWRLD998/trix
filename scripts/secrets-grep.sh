#!/usr/bin/env bash
# Run before every push. Fails if a secret-shaped string is tracked. Reads values from the environment only.
set -u
fail=0
for v in UW_API_KEY TELEGRAM_BOT_TOKEN DATABASE_URL; do
  val="${!v:-}"
  if [ -n "$val" ] && git grep -qF -- "$val" $(git ls-files); then echo "LEAK: value of $v found in tracked files"; fail=1; fi
done
if git ls-files | xargs grep -nE '[0-9]{8,10}:[A-Za-z0-9_-]{35}|postgres(ql)?://[^ $<]+:[^ $<@]+@|Bearer [A-Za-z0-9._-]{20,}' 2>/dev/null | grep -v 'secrets-grep.sh'; then echo "LEAK: secret-shaped string"; fail=1; fi
[ $fail = 0 ] && echo "secrets grep clean"
exit $fail
