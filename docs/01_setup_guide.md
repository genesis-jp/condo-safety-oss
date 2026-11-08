---
created: 2026-11-08
tags: [ai-generated, gemini-generated]
---

# 📘 01. 導入手順書（セットアップガイド）
**Setup Guide: Google Apps Script, Spreadsheet, Deployment & Initial Configuration**

本ガイドでは、マンション管理組合・自治会・HOA（Homeowners Association）のGoogleアカウントを使って、**災害時安否確認システム（Open Source Edition）** をゼロから構築・公開する手順を解説します。

---

## 1. 事前準備（必要なもの）

1. **管理組合・防災会用の共用Googleアカウント（1つ）**
   - 例: `your-condo-board@gmail.com`
   - ※個人のGoogleアカウントではなく、理事会や自治会で毎年引き継げる共用アカウントで作成することを強く推奨します。
2. **本リポジトリのソースコード（2ファイル）**
   - [`src/Code.gs`](../src/Code.gs)（バックエンド処理・スプレッドシート自動構築プログラム）
   - [`src/index.html`](../src/index.html)（フロントエンド画面・日英バイリンガルUI）

---

## 2. マンション固有情報（階数・戸数・名称）のカスタマイズ

Google Apps Scriptへ貼り付ける前に、ご自身のマンションの規模・名称に合わせて設定ブロックを書き換えます。

### 2-1. `src/Code.gs` の `DEFAULT_CONFIG` を編集する

[`src/Code.gs`](../src/Code.gs) 先頭（23〜65行目付近）にある `DEFAULT_CONFIG` を編集します。

```javascript
const DEFAULT_CONFIG = {
  // 1. マンション・建物名称 (Building / Condo Name)
  BUILDING_NAME_JA: 'サンプルレジデンス',
  BUILDING_NAME_EN: 'Sunrise Condominium',

  // 2. 現在の運用期・年度ラベル (Current Board Term / Fiscal Year)
  TERM_TITLE_JA: '2026年度 (第12期)',
  TERM_TITLE_EN: 'FY2026 (Term 12)',

  // 3. Googleドライブ内の保存フォルダ名 (Google Drive Folder Hierarchy)
  DRIVE_ROOT_FOLDER_NAME: '安否確認システム',
  DRIVE_YEAR_FOLDER_NAME: '2026年版',
  DRIVE_DB_FILE_NAME: 'マンション安否確認データベース_2026年度',
  DRIVE_AUDIT_FILE_NAME: '操作監査ログ_2026年度.csv',

  // 4. 理事会・防災委員会のGoogleグループアドレス (Board Google Group Email)
  ADMIN_GOOGLE_GROUP: 'your-condo-board@googlegroups.com',

  // 5. 各階の戸数設定 (Floor Layout: { 階数: 戸数 })
  // 例: 7階建て・全97戸の場合（7F: 701〜708号室、6F: 601〜611号室 ...）
  FLOOR_CONFIG: { 7: 8, 6: 11, 5: 15, 4: 16, 3: 17, 2: 16, 1: 14 },

  // 6. 理事・管理者（役員）の「部屋番号 : Googleメールアドレス」1対1紐付けマスタ
  ADMIN_ROOM_TO_EMAIL: {
    '103': 'board103@example.com',
    '202': 'board202@example.com',
    '401': 'board401@example.com'
  },

  // 7. 一般世帯への全体安否マップ（個人情報マスク済み）の閲覧公開初期値
  ALLOW_RESIDENT_PUBLIC_MAP: true
};
```

### 2-2. `src/index.html` の `APP_CONFIG` を編集する

[`src/index.html`](../src/index.html) 内の `APP_CONFIG`（1226行目付近）も、`DEFAULT_CONFIG` と同じ建物名称・階数・戸数・管理者リストに合わせて更新します。

```javascript
var APP_CONFIG = {
  buildingNameJa: 'サンプルレジデンス',
  buildingNameEn: 'Sunrise Condominium',
  termTitleJa: '2026年度 (第12期)',
  termTitleEn: 'FY2026 (Term 12)',
  adminGroupEmail: 'your-condo-board@googlegroups.com',
  floorConfig: { 7: 8, 6: 11, 5: 15, 4: 16, 3: 17, 2: 16, 1: 14 },
  adminRoomToEmail: {
    '103': 'board103@example.com',
    '202': 'board202@example.com',
    '401': 'board401@example.com'
  }
};
```

---

## 3. Google Apps Script (GAS) プロジェクトの作成

1. 管理組合のGoogleアカウント（例: `your-condo-board@gmail.com`）でログインし、[Google Apps Script](https://script.google.com/) を開きます。
2. 左上の **「＋ 新しいプロジェクト」** をクリックします。
3. 画面上部の「無題のプロジェクト」をクリックし、わかりやすい名前（例: `マンション安否確認システム_2026年度版`）に変更します。

### 3-1. `コード.gs` の貼り付け
1. 左側メニューの「ファイル」にある **`コード.gs`**（または `Code.gs`）を選択します。
2. もともと書かれている `function myFunction() { ... }` をすべて削除し、[`src/Code.gs`](../src/Code.gs) の内容をすべてコピーして貼り付けます。
3. キーボードの `Ctrl + S`（Macは `Cmd + S`）を押して保存します（ファイル名横のオレンジ色の●が消えれば保存完了です）。

> ⚠️ **よくあるミス（注意）**
> `コード.gs` にHTMLファイル（`<!DOCTYPE html>...`）を誤って貼り付けると、`SyntaxError: Unexpected token '<'` という構文エラーが発生します。`コード.gs` には必ず `src/Code.gs` のみを貼り付けてください。

### 3-2. `index.html` の作成と貼り付け
1. 左側メニュー「ファイル」の右にある **「＋」ボタン ＞「HTML」** をクリックします。
2. ファイル名入力欄に **`index`** と入力して `Enter` キーを押します（自動的に `index.html` になります）。
3. 自動挿入された初期HTMLテンプレートをすべて削除し、[`src/index.html`](../src/index.html) の内容をすべてコピーして貼り付けます。
4. `Ctrl + S`（Macは `Cmd + S`）を押して保存します。

---

## 4. Googleドライブとスプレッドシートの自動準備（手動作成不要）

本システムは、**事前にスプレッドシートを手動で作成する必要はありません**。初回実行時に以下のフォルダ階層とデータベースが管理組合のGoogleドライブ内に自動生成されます。

```text
📁 マイドライブ (Google Drive)
 └── 📁 安否確認システム (DRIVE_ROOT_FOLDER_NAME)
      └── 📁 2026年版 (DRIVE_YEAR_FOLDER_NAME)
           ├── 📊 マンション安否確認データベース_2026年度 (Google スプレッドシート)
           └── 📄 操作監査ログ_2026年度.csv (すべての操作・代行入力・リセット監査ログ)
```

### 自動生成される5つのシート構成

| シート名 | 用途・保存されるデータ |
|---|---|
| **`m_users`** | 全戸マスタ（`room_number`, `owner_name`, `primary_email`, `member_count`, `pin_code`, `is_admin`, `has_registered_email`） |
| **`t_latest_status`** | 各部屋の最新安否ステータス（ダッシュボード表示用キャッシュ） |
| **`t_safety_logs`** | 住民および管理者による安否報告の全履歴ログ（追記型） |
| **`t_audit_logs`** | 管理者ログイン、モード切替、全件リセット等のセキュリティ監査ログ |
| **`m_settings`** | システム設定値（`TERM_TITLE`, `TRAINING_MODE`, `SYSTEM_ANNOUNCEMENT`） |

> 🔒 **Googleドライブの共有設定に関する重要なセキュリティ仕様**
> Googleドライブ上の `安否確認システム` フォルダやスプレッドシートを、**住民向けに「リンクを知っている全員に共有」する必要はありません（非公開のままで動作します）**。
> 次のステップでWebアプリの「次のユーザーとして実行」を **`自分`** に設定するため、住民がアプリを操作するとGASが裏側で安全にスプレッドシートを読み書きします。これにより、住民がスプレッドシートのURLを直接開いて他世帯の個人情報を覗き見るリスクを完全に遮断できます。

---

## 5. Webアプリのデプロイ（公開）手順

1. Apps Scriptエディタ右上の青い **「デプロイ」ボタン ＞「新しいデプロイ」** をクリックします。
2. 左上の歯車アイコン（⚙️「種類の選択」）をクリックし、**「ウェブアプリ」** を選択します。
3. 以下の3項目を設定します：
   - **説明**: `2026年度 初期リリース`（任意）
   - **次のユーザーとして実行 (Execute as)**: **`自分 (your-condo-board@gmail.com)`**
   - **アクセスできるユーザー (Who has access)**: **`全員 (Anyone)`**
4. **「デプロイ」** ボタンをクリックします。
5. 初回のみ **「アクセスを承認」** ダイアログが表示されます：
   - 「アクセスを承認」をクリック ＞ 管理組合のGoogleアカウントを選択。
   - 「このアプリはGoogleで確認されていません」と表示された場合は、左下の **「詳細」** をクリックし、一番下の **「（プロジェクト名）（安全ではないページ）に移動」** をクリックして **「許可」** を押します（※自分自身が作成したGASスクリプトに対して必ず表示される標準画面です）。
6. デプロイ完了画面に表示される **「ウェブアプリ URL」**（末尾が `/exec` のURL）をコピーします。
   - 例: `https://script.google.com/macros/s/<YOUR_DEPLOYMENT_ID>/exec`

> 💡 **注意**: ブラウザ上部のアドレスバーにある `https://script.google.com/home/projects/<YOUR_SCRIPT_ID>/edit` はプログラム編集画面のURLです。住民へ配布するURLには、必ずデプロイ完了時に発行される **`https://script.google.com/macros/s/.../exec`** を使用してください。

---

## 6. 初期設定の確認（スプレッドシートの微調整）

1. コピーしたウェブアプリURL（`.../exec`）をブラウザで1回開きます。
2. これだけで `initSpreadsheetIfNeeded()` が自動実行され、Googleドライブの **`マイドライブ > 安否確認システム > 2026年版`** フォルダ内に **`マンション安否確認データベース_2026年度`** が作成されます。
3. スプレッドシートを開き、必要に応じて **`m_users` シート** の以下の列を実際の世帯情報に合わせて調整してください：
   - **`pin_code`**: 初期値は `0` + 部屋番号（例: 305号室なら `0305`）です。マンション独自のルールや各戸別の4桁暗証番号に変更可能です。
   - **`has_registered_email`**: 連絡網メール登録済み世帯は `TRUE`（ダッシュボード上で青枠 `✉` 表示）、未登録世帯は `FALSE` に設定します。
   - **`is_admin`** / **`primary_email`**: 理事・防災役員の部屋は `is_admin` を `TRUE` にし、`primary_email` に役員個人のGoogleメールアドレスを入力します（詳細は [02_google_groups.md](./02_google_groups.md) を参照）。

---

## 🔗 次のステップ
- 理事会メンバーのGoogleグループ作成とパスキー1対1認証の設定は **[02. Googleグループ・管理者認証ガイド](./02_google_groups.md)** へ進んでください。
