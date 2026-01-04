#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Setup Mac-only Auto Release (Tauri) from scratch"

# --- 0) Ensure we're inside git repo ---
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "❌ لازم تكون داخل repo (مثلاً داخل /Users/malekedrees/Downloads/B2u-plus)"
  exit 1
}

# --- 1) Abort any stuck rebase and clean rebase dirs ---
echo "🧹 Cleaning stuck rebases..."
git rebase --abort 2>/dev/null || true
rm -rf .git/rebase-merge .git/rebase-apply 2>/dev/null || true

# --- 2) Remove accidental embedded repo/submodule artifacts (_b2uprog) ---
echo "🧽 Removing _b2uprog submodule artifacts if any..."
git rm -r --cached _b2uprog 2>/dev/null || true
rm -rf _b2uprog .git/modules/_b2uprog 2>/dev/null || true
rm -f .gitmodules 2>/dev/null || true

# --- 3) Ask for signing password (avoid @ to reduce user confusion) ---
echo ""
read -rsp "🔐 اكتب باسورد جديد للمفتاح (يفضل بدون @): " KEY_PASS
echo ""
[[ -n "${KEY_PASS}" ]] || { echo "❌ لازم باسورد"; exit 1; }

# --- 4) Generate new Tauri signing keys (Mac local) ---
echo "🔑 Generating new Tauri signing keys..."
mkdir -p "$HOME/.tauri"
rm -f "$HOME/.tauri/b2u-plus-erp.key" "$HOME/.tauri/b2u-plus-erp.key.pub" 2>/dev/null || true

npx tauri signer generate \
  --write-keys "$HOME/.tauri/b2u-plus-erp.key" \
  --password "$KEY_PASS" \
  --force \
  --ci

echo "✅ Keys generated:"
ls -la "$HOME/.tauri" | grep b2u-plus-erp || true

# --- 5) Create Base64 of PRIVATE KEY (single line) + pubkey single line ---
KEY_B64="$(base64 < "$HOME/.tauri/b2u-plus-erp.key" | tr -d '\n')"
PUBKEY_ONELINE="$(tr -d '\n' < "$HOME/.tauri/b2u-plus-erp.key.pub")"

# --- 6) Patch src-tauri/tauri.conf.json with updater endpoint + pubkey ---
echo "🧩 Updating src-tauri/tauri.conf.json updater pubkey..."
node <<NODE
const fs = require("fs");
const path = "src-tauri/tauri.conf.json";
const j = JSON.parse(fs.readFileSync(path,"utf8"));

j.plugins = j.plugins || {};
j.plugins.updater = j.plugins.updater || {};

j.plugins.updater.active = true;
j.plugins.updater.endpoints = [
  "https://github.com/malekedrees84/b2u-plus-erp/releases/latest/download/latest.json"
];
j.plugins.updater.pubkey = "${PUBKEY_ONELINE}";
j.plugins.updater.windows = { installMode: "passive" };

fs.writeFileSync(path, JSON.stringify(j, null, 2));
console.log("✅ Updated tauri.conf.json");
NODE

# --- 7) Create/overwrite workflow: macOS only ---
echo "⚙️ Writing .github/workflows/release.yml (macOS only)..."
mkdir -p .github/workflows
cat > .github/workflows/release.yml <<'YAML'
name: Auto Release (Tauri) - macOS (Signed)

on:
  workflow_dispatch:
  push:
    branches: [ main ]

permissions:
  contents: write

jobs:
  mac_release:
    runs-on: macos-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        shell: bash
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi

      - name: Install Tauri CLI
        run: npm i -D @tauri-apps/cli

      # ✅ Write signing key from Base64 secret to file
      - name: Write signing key (from Base64 Secret)
        shell: bash
        run: |
          set -e
          mkdir -p "$HOME/.tauri"
          echo "${TAURI_SIGNING_PRIVATE_KEY_B64}" | tr -d '\n' | base64 --decode > "$HOME/.tauri/b2u-plus-erp.key"
          chmod 600 "$HOME/.tauri/b2u-plus-erp.key"
          echo "✅ Key written"

        env:
          TAURI_SIGNING_PRIVATE_KEY_B64: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_B64 }}

      - name: Build Tauri (release)
        run: npx tauri build

      - name: Sign DMG
        shell: bash
        run: |
          set -e
          DMG="$(ls src-tauri/target/release/bundle/dmg/*.dmg | head -n 1)"
          echo "Signing $DMG"
          npx tauri signer sign "$DMG" \
            --private-key-path "$HOME/.tauri/b2u-plus-erp.key" \
            --password "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD}"
        env:
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

      - name: Upload Release (latest)
        uses: softprops/action-gh-release@v2
        with:
          tag_name: latest
          name: latest
          make_latest: true
          overwrite: true
          fail_on_unmatched_files: false
          files: |
            src-tauri/target/release/bundle/dmg/*.dmg
            src-tauri/target/release/bundle/dmg/*.sig
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
YAML

# --- 8) Clean temp files that keep appearing ---
rm -f latest.json~ src-tauri/tauri.conf.jso 2>/dev/null || true

# --- 9) Commit + pull --rebase + push ---
echo "📦 Committing changes..."
git add -A
git commit -m "ci: mac auto release + fresh signing keys" || true

echo "🔄 Pulling (rebase) latest from origin/main..."
git pull --rebase origin main

echo "⬆️ Pushing to GitHub..."
git push origin main

# --- 10) Print secrets for GitHub Actions ---
echo ""
echo "======================================================"
echo "✅ الآن على GitHub repo: b2u-plus-erp"
echo "Settings → Secrets and variables → Actions"
echo ""
echo "1) Secret name: TAURI_SIGNING_PRIVATE_KEY_B64"
echo "Value (انسخ كامل):"
echo "$KEY_B64"
echo ""
echo "2) Secret name: TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
echo "Value:"
echo "$KEY_PASS"
echo "======================================================"
echo ""
echo "بعد ما تضيف Secrets:"
echo "روح Actions وشغّل workflow يدويًا (workflow_dispatch) أو اعمل push جديد."
