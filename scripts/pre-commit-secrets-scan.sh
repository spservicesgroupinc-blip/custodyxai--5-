#!/bin/bash
# Pre-commit hook: Prevent API keys and secrets from being committed
# Install with: chmod +x .husky/pre-commit (or use husky + lint-staged)

echo "Scanning for exposed secrets..."

# Check for patterns that look like API keys
PATTERNS=(
  "AIzaSy[A-Za-z0-9_-]{35}"         # Google API keys
  "sk-[A-Za-z0-9]{20,}"             # OpenAI-style keys
  "ghp_[A-Za-z0-9]{36}"            # GitHub personal access tokens
  "AKIA[0-9A-Z]{16}"               # AWS access keys
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  MATCHES=$(git diff --cached -U0 | grep -E "$pattern" | grep -v "^---" | grep -v "^+++" || true)
  if [ -n "$MATCHES" ]; then
    echo "❌ BLOCKED: Potential secret found in staged files!"
    echo "$MATCHES"
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  echo ""
  echo "Commit blocked. Remove secrets and use .env.local instead."
  exit 1
fi

echo "✓ No secrets detected."
exit 0
