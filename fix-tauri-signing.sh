#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Fix Tauri signing (clean keys + workflow) for b2u-plus-erp"

# 0) تأكد أنك داخل مشروع git
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ لازم تكون داخل فولدر المشروع اللي فيه git"
  exit 1
fi

# 1) إلغاء أي rebase عالق (إذا موجود)
git rebase --abort 2>/dev/null || true
rm -rf .git/rebase-merge .git/rebase-apply 2>/dev/null || true

# 2) إزالة أي بقايا submodule/_b2uprog لو انضاف بالغلط
git rm -r --cached _b2uprog 2>/dev/null || true
rm -rf _b2uprog .git/modules/_b2uprog 2>/dev/null || true
rm -f .gitmodules 2>/dev/null || true

# 3) طلب باسورد جديد للمفتاح (بدون @ لتجنب مشاكل اللصق)
echo ""
read -rsp "🔐 اكتب باسورد جديد للمفتاح (يفضل بدون @): " KEY_PASS
echo ""
if [[ -z "${KEY_PASS}" ]]; then
  echo "❌ لازم تكتب باسورد"
  exit 1
fi

# 4) توليد مفاتيح جديدة (مفتاح خاص + عام)
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

# 5) تأكيد أن المفتاح الخاص شكله صحيح (لازم يحتوي untrusted comment)
if ! grep -q "untrusted comment" "$HOME/.tauri/b2u-plus-erp.key"; then
  echo "❌ المفتاح الخاص غير صحيح (Missing untrusted comment)."
  echo "افتح الملف وتأكد: $HOME/.tauri/b2u-plus-erp.key"
  exit 1
fi

# 6) تحديث pubkey داخل src-tauri/tauri.conf.json
PUBKEY_ONELINE="$(tr -d '\n' < "$HOME/.tauri/b2u-plus-erp.key.pub")"

if [[ ! -f "src-tauri/tauri.conf.json" ]]; then
  echo "❌ ملف src-tauri/tauri.conf.json غير موجود"
  exit 1
fi

node <<NODE
const fs = require("fs");
const path = "src-tauri/tauri.conf.json";
const j = JSON.parse(fs.readFileSync(path, "utf8"));

j.plugins = j.plugins || {};
j.plugins.updater = j.plugins.updater || {};
j.plugins.updater.active = true;
j.plugins.updater.endpoints = [
  "https://github.com/malekedrees84/b2u-plus-erp/releases/latest/download/latest.json"
];
j.plugins.updater.pubkey = "${PUBKEY_ONELINE}";
j.plugins.updater.windows = { installMode: "passive" };

fs.writeFileSync(path, JSON.stringify(j, null, 2));
console.log("✅ Updated tauri.conf.json pubkey");
NODE

# 7) كتابة release.yml مضبوط + حل submodule + حل base64
mkdir -p .github/workflows

cat > .github/workflows/release.yml <<'YAML'
name: Auto Release (Tauri) - macOS + Windows (Signed)

on:
  workflow_dispatch:
  push:
    branches: [ main ]

permissions:
  contents: write

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, windows-latest]

    runs-on: ${{ matrix.os }}

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

      - name: Install deps
        shell: bash
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi

      - name: Install Tauri CLI
        run: npm i -D @tauri-apps/cli

      # ✅ نكتب المفتاح من Base64 Secret إلى ملف (بدون مشاكل أسطر/رموز)
      - name: Write signing key from Base64 Secret
        shell: bash
        run: |
          set -e
          mkdir -p "$HOME/.tauri"
          echo "${TAURI_SIGNING_PRIVATE_KEY_B64}" | tr -d '\n' | base64 --decode > "$HOME/.tauri/b2u-plus-erp.key"
          chmod 600 "$HOME/.tauri/b2u-plus-erp.key"
          echo "✅ Key file ready"
        env:
          TAURI_SIGNING_PRIVATE_KEY_B64: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_B64 }}

      - name: Build Tauri
        run: npx tauri build

      # ✅ توقيع ملفات التحديث (DMG/MSI/EXE) حسب النظام
      - name: Sign bundles
        shell: bash
        run: |
          set -e
          PASS="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD}"

          sign_one () {
            local f="$1"
            echo "Signing: $f"
            npx tauri signer sign "$f" \
              --private-key-path "$HOME/.tauri/b2u-plus-erp.key" \
              --password "$PASS"
          }

          if [[ "$RUNNER_OS" == "macOS" ]]; then
            DMG="$(ls src-tauri/target/release/bundle/dmg/*.dmg | head -n 1 || true)"
            [[ -n "$DMG" ]] && sign_one "$DMG"
          fi

          if [[ "$RUNNER_OS" == "Windows" ]]; then
            MSI="$(ls src-tauri/target/release/bundle/msi/*.msi 2>/dev/null | head -n 1 || true)"
            EXE="$(ls src-tauri/target/release/bundle/nsis/*.exe 2>/dev/null | head -n 1 || true)"
            [[ -n "$MSI" ]] && sign_one "$MSI"
            [[ -n "$EXE" ]] && sign_one "$EXE"
          fi
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
            src-tauri/target/release/bundle/msi/*.msi
            src-tauri/target/release/bundle/msi/*.sig
            src-tauri/target/release/bundle/nsis/*.exe
            src-tauri/target/release/bundle/nsis/*.sig
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
YAML

# 8) حذف الملفات المؤقتة اللي عندك (nano backups)
rm -f latest.json~ src-tauri/tauri.conf.jso 2>/dev/null || true

# 9) Commit + Pull rebase + Push
git add -A
git commit -m "ci: fix signing keys + workflow (base64 key)" || true

git pull --rebase origin main
git push origin main

# 10) طباعة المطلوب للـ GitHub Secrets
echo ""
echo "======================================================"
echo "✅ الآن لازم تعمل Secrets في GitHub (b2u-plus-erp):"
echo "Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "1) TAURI_SIGNING_PRIVATE_KEY_B64"
echo "   (انسخ هذا النص كامل كما هو):"
echo ""
# base64 بدون أسطر (macOS)
base64 < "$HOME/.tauri/b2u-plus-erp.key" | tr -d '\n'
echo ""
echo ""
echo "2) TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
echo "   اكتب نفس الباسورد اللي اخترته (بدون اقتباس):"
echo "   $KEY_PASS"
echo ""
echo "✅ pubkey تم تحديثه تلقائيًا داخل src-tauri/tauri.conf.json"
echo "======================================================"
echo ""
echo "بعد ما تضيف Secrets: ادخل على GitHub → Actions وشغل workflow يدوي (Run workflow) أو اعمل push صغير."
