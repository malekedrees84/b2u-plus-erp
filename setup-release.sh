#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Setup Auto-Release for b2u-plus-erp (one-shot)"

# ====== Settings ======
REPO_NAME_EXPECTED="B2u-plus"      # اسم فولدر مشروعك المحلي
BRANCH="main"
TAURI_KEY_NAME="b2u-plus-erp"
UPDATER_ENDPOINT="https://github.com/malekedrees84/b2u-plus-erp/releases/latest/download/latest.json"
PASSWORD="b2uplus123"             # غيّرها إذا بدك، بس خليك على كلمة بسيطة بدون رموز أول مرة
# ======================

# 0) Ensure correct folder
if [[ "$(basename "$PWD")" != "$REPO_NAME_EXPECTED" ]]; then
  echo "❌ لازم تكون داخل فولدر: $REPO_NAME_EXPECTED"
  echo "   انت حالياً داخل: $(basename "$PWD")"
  exit 1
fi

# 1) Abort any stuck rebase + cleanup
echo "🧹 Cleaning git state..."
git rebase --abort 2>/dev/null || true
git merge --abort 2>/dev/null || true
rm -rf .git/rebase-merge .git/rebase-apply 2>/dev/null || true

# 2) Remove accidental embedded repo _b2uprog from index (if exists)
if git ls-files --stage | grep -q " _b2uprog$"; then
  echo "🧼 Removing embedded _b2uprog from git index..."
  git rm -r --cached _b2uprog >/dev/null 2>&1 || true
fi
rm -rf _b2uprog .git/modules/_b2uprog 2>/dev/null || true

# 3) Generate fresh Tauri signing keys
echo "🔑 Generating fresh Tauri signing keys..."
mkdir -p "$HOME/.tauri"
rm -f "$HOME/.tauri/${TAURI_KEY_NAME}.key" "$HOME/.tauri/${TAURI_KEY_NAME}.key.pub" 2>/dev/null || true

npx tauri signer generate \
  --write-keys "$HOME/.tauri/${TAURI_KEY_NAME}.key" \
  --password "$PASSWORD" \
  --force \
  --ci

echo "✅ Keys generated:"
ls -la "$HOME/.tauri" | grep "${TAURI_KEY_NAME}.key" || true
ls -la "$HOME/.tauri" | grep "${TAURI_KEY_NAME}.key.pub" || true

# 4) Read pubkey (single line) and update tauri.conf.json
PUBKEY="$(cat "$HOME/.tauri/${TAURI_KEY_NAME}.key.pub" | tr -d '\n\r')"

echo "🛠 Updating src-tauri/tauri.conf.json updater.pubkey + endpoint..."
node <<NODE
const fs = require("fs");
const path = "src-tauri/tauri.conf.json";
const j = JSON.parse(fs.readFileSync(path,"utf8"));

j.plugins = j.plugins || {};
j.plugins.updater = j.plugins.updater || {};
j.plugins.updater.active = true;
j.plugins.updater.endpoints = ["$UPDATER_ENDPOINT"];
j.plugins.updater.pubkey = "$PUBKEY";
j.plugins.updater.windows = j.plugins.updater.windows || { installMode: "passive" };

fs.writeFileSync(path, JSON.stringify(j, null, 2));
console.log("✅ Updated tauri.conf.json");
NODE

# 5) Prepare base64 of private key for GitHub secret (single line)
echo "🔐 Preparing TAURI_SIGNING_PRIVATE_KEY_B64..."
PRIVATE_KEY_B64="$(base64 -i "$HOME/.tauri/${TAURI_KEY_NAME}.key" | tr -d '\n\r')"

# 6) Git identity (local)
git config user.name  "malekedrees"
git config user.email "malekedrees@users.noreply.github.com" || true

# 7) Clean temp files you had
rm -f latest.json~ src-tauri/tauri.conf.jso 2>/dev/null || true

# 8) Commit changes
echo "📦 Committing changes..."
git add -A
git commit -m "chore: refresh tauri signing keys + updater pubkey" || echo "ℹ️ No changes to commit."

# 9) Rebase pull + push (best effort)
echo "⬇️ Pulling latest (rebase) from origin/$BRANCH ..."
git pull --rebase origin "$BRANCH" || {
  echo "❌ Rebase conflict حصل. نفّذ:"
  echo "   git status"
  echo "   (حل التعارضات) ثم: git rebase --continue"
  echo "   أو لإلغاء: git rebase --abort"
  exit 1
}

echo "⬆️ Pushing to origin/$BRANCH ..."
git push origin "$BRANCH" || {
  echo "❌ Push فشل. نفّذ:"
  echo "   git status"
  echo "   git pull --rebase origin $BRANCH"
  echo "   git push origin $BRANCH"
  exit 1
}

# 10) Optional: set secrets automatically if gh cli available
if command -v gh >/dev/null 2>&1; then
  echo "🔎 gh (GitHub CLI) موجود. بحاول أضبط Secrets تلقائياً إذا أنت عامل login..."
  if gh auth status >/dev/null 2>&1; then
    echo "✅ gh authenticated. Setting secrets in repo b2u-plus-erp..."
    printf "%s" "$PRIVATE_KEY_B64" | gh secret set TAURI_SIGNING_PRIVATE_KEY_B64 -R malekedrees84/b2u-plus-erp
    printf "%s" "$PASSWORD"       | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD -R malekedrees84/b2u-plus-erp
    echo "✅ Secrets set via gh."
  else
    echo "⚠️ gh موجود بس مش عامل login."
    echo "   اعمل: gh auth login"
  fi
else
  echo "ℹ️ gh CLI مش موجود—رح أطبعلك القيم لتضيفها يدويًا في GitHub Secrets."
fi

echo ""
echo "==================== ✅ DONE ===================="
echo "📌 الآن عندك لازم Secrets في GitHub Actions:"
echo ""
echo "1) TAURI_SIGNING_PRIVATE_KEY_B64  (انسخ هذا بالكامل سطر واحد):"
echo "$PRIVATE_KEY_B64"
echo ""
echo "2) TAURI_SIGNING_PRIVATE_KEY_PASSWORD:"
echo "$PASSWORD"
echo ""
echo "🔔 بعد ما تضيفهم: اعمل commit فارغ لتشغيل الـ Action:"
echo "   git commit --allow-empty -m \"trigger release\""
echo "   git push origin $BRANCH"
echo "================================================="
