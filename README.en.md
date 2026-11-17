---
created: 2026-11-07
tags: [ai-generated, gemini-generated]
---

# 🏢 Condominium & Apartment Emergency Safety Check System (Open Source Edition v2.1)

**[🇯🇵 日本語版 README はこちら](./README.md)** ｜ **[📝 Changelog](./CHANGELOG.md)**

A **serverless, zero-cost real-time emergency safety & damage reporting web application** designed for Condominiums, Apartments, Homeowners Associations (HOAs), and Community Disaster Response Teams during earthquakes, typhoons, power outages, or safety drills.

Powered entirely by free-tier **Google Apps Script (GAS)**, **Google Sheets**, and **Google Drive**, any building or HOA can deploy and operate this system for **$0/month** with no external servers required.

---

## 🎮 Interactive Live Demo

Try the system right now in your browser! You can switch between **English** and **Japanese** anytime using the **`🌐 English / 日本語`** button in the top-right header.

- 🌍 **English Live Demo**: `https://genesis-jp.github.io/condo-safety-oss/?lang=en`
- 🇯🇵 **Japanese Live Demo**: `https://genesis-jp.github.io/condo-safety-oss/?lang=ja`

> 💡 **Quick Demo Showcase Bar**
> Click the buttons in the top demo bar to test every feature with one click:
> - **"🔐 Try Admin Dashboard (Unit 401)"**: Unlock full unit details, pre-registered support flags, 1-page A4 print preview, Drill/Emergency toggle, and bulk reset.
> - **"🏠 Try Resident Report (Unit 305)"**: Test "Safe at Home / Evacuated / Rescue Request", independent "Door Tag Posted", and "Door Jammed / Other Damage".
> - **"🧪 Load Sample Drill Data"** / **"🖨️ A4 Printable Report"**: Populate realistic drill data and preview the 1-page A4 triage report.

---

## ✨ Key Features

1. **100% Free & Serverless ($0/month)**
   - Runs entirely on a single shared Google Account (`@gmail.com`) belonging to your Condo Board or HOA using Google Apps Script, Google Sheets, and Google Drive.
2. **Strong Defense Against Data Leakage (Private Drive DB, Default-Private Map & WebAuthn Passkey Auth)**
   - **Zero Public Folder Sharing**: Automatically creates an annual folder hierarchy (`My Drive > 安否確認システム > 2026年版`) inside the Board's Google Drive. **You do NOT need to share the Google Drive folder or Spreadsheet publicly with residents**, eliminating direct database exposure.
   - **Default-Private Public Map & Confidential Support Registry**: The resident-facing building map is **hidden by default** (`ALLOW_RESIDENT_PUBLIC_MAP: false`). Moreover, pre-registered **Support-Needed Units (`🤝`)** are strictly visible to Board Admins only and never exposed in resident views (v2.0).
   - **Instant Device Passkey & Google Account Popup Auth (v2.1)**: Authenticates immediately via Face ID / Touch ID if a passkey is saved on the device, or opens the Google Account authentication popup when not yet saved (email OTP fallback is commented out to avoid delays during disasters).
3. **Inclusive Hybrid Operation (Coexisting with Magnetic Door Tags, Equipment Issues & 2-Table A4 Report)**
   - Residents report **Safe at Home / Evacuated / Rescue Request**, plus an independent **Door Safety Tag Posted (`🚪`)** checkbox designed to **coexist with existing magnetic door-tag / safety placard methods** so safety can be confirmed reliably through both digital reporting and physical door checks, alongside **Entrance Door Jammed (`🔒`) / Other Damage (`⚠️`)** checkboxes.
   - Board members can enter proxy reports (`[代]`) and print a **1-page A4 report** featuring separate tables for **Emergency Rescue/Damage** and **Pre-Registered Support Units**.
4. **Instant Bilingual UI (`🌐 English / 日本語`)**
   - One-click toggle between English and Japanese (or via URL parameter `?lang=en` / `?lang=ja`), covering all status badges, modals, checklists, and CSV exports—ideal for international communities and multicultural buildings.

---

## 📚 Documentation & Operation Manuals (`docs/`)

Detailed operational guides are available in the [`docs/`](./docs/) directory:

- **[📘 01. Setup Guide (`docs/01_setup_guide.md`)](./docs/01_setup_guide.md)** — Apps Script creation, automatic Spreadsheet setup, Web App deployment, and initial settings.
- **[🔐 02. Google Groups & Passkey Admin Guide (`docs/02_google_groups.md`)](./docs/02_google_groups.md)** — Creating the board Google Group, member management, and 1-to-1 Passkey admin binding.
- **[🔄 03. Annual Handover Manual (`docs/03_annual_handover.md`)](./docs/03_annual_handover.md)** — Fiscal year URL rotation, data archiving, and board member transition checklist.
- **[🚨 04. Safety Drill & Emergency Operation Guide (`docs/04_drill_operation.md`)](./docs/04_drill_operation.md)** — Drill day workflow, admin proxy reporting (`[代]`), and 1-page A4 report printing/PDF export.
- **[📝 Changelog (`CHANGELOG.md`)](./CHANGELOG.md)** — Version history from v1.0.0 to v2.0.0.

---

## 🚀 15-Minute Setup Guide

### Step 1: Customize Your Building Name, Floors & Units

1. Open [`src/Code.gs`](./src/Code.gs) and edit the `DEFAULT_CONFIG` block at the top (lines 23–65):
   - `BUILDING_NAME_EN` / `BUILDING_NAME_JA`: Your building or HOA name (e.g., `Sunrise Condominium` / `サンプルレジデンス`)
   - `TERM_TITLE_EN` / `TERM_TITLE_JA`: Fiscal year or board term label (e.g., `FY2026 (Term 12)`)
   - `FLOOR_CONFIG`: Define the floors and unit counts for your building (e.g., `{ 7: 8, 6: 11, ... }`).
2. Optionally update the matching `APP_CONFIG` block inside [`src/index.html`](./src/index.html) (around line 1226) so offline/demo mode mirrors your exact building layout.

### Step 2: Configure Board / HOA Admin Accounts (1-to-1 Mapping)

1. **Google Group (Optional & Recommended)**:
   - Create a [Google Group](https://groups.google.com/) under your HOA's Google account (e.g., `your-condo-board@googlegroups.com`) to manage current board members' email addresses in one place.
2. **Map Admin Units to Google Emails**:
   - In [`src/Code.gs`](./src/Code.gs) (`ADMIN_ROOM_TO_EMAIL`) or in the **`m_users` sheet** of the generated Google Spreadsheet, register each board member's **Unit Number** alongside their **personal Google email address** (see [docs/02_google_groups.md](./docs/02_google_groups.md) for details).

### Step 3: Deploy to Google Apps Script (GAS)

1. Sign in to your HOA's Google Account, open [Google Apps Script](https://script.google.com/), and click **"New project"**.
2. Paste the contents of [`src/Code.gs`](./src/Code.gs) into the default `Code.gs` (`コード.gs`) file.
3. Click **`+` (Add a file) > HTML**, name the file **`index`** (it becomes `index.html`), and paste the contents of [`src/index.html`](./src/index.html).
4. Click **Deploy > New deployment** in the top-right corner and select:
   - **Type**: `Web app`
   - **Execute as**: **`Me`** *(Allows the script to read/write the HOA's private Google Drive folder without sharing the folder with residents)*
   - **Who has access**: **`Anyone`** *(Allows residents to open the app immediately on their smartphones during an emergency)*
5. Share the generated `https://script.google.com/macros/s/.../exec` URL (and a QR code) with residents on your building bulletin board and drill flyers.

---

## ⚖️ License & Emergency Disclaimer (Important)

This software is available under a **[dual license (Non-Commercial License / Commercial License)](./LICENSE)**.

| License | Who | Terms |
|---|---|---|
| **Non-Commercial License** | Condo associations, HOAs, neighborhood disaster response teams, non-profits, individuals, educational institutions | Free of charge |
| **Commercial License** | Property management companies, integrators, for-profit businesses | Separate paid agreement with Genesis LLC |

### ✅ Free under the Non-Commercial License
- Condominium associations, HOAs, apartment communities, neighborhood disaster response teams, non-profits, and individuals are **free to use, copy, modify, and redistribute** this software at no cost.
- A condo association that installs and runs the software itself, paid for from its regular budget, may also use it free of charge.

### 💼 Commercial License Required
The following uses require a Commercial License agreement with Genesis LLC:
- **Selling the software (or modified versions), offering it as a paid SaaS or commercial package, or charging for installation services**
- **A property or building management company providing the software to the properties it manages or to its customers as part of its own services** (whether paid or free)
- **A for-profit company using the software in its business to check the safety of employees, facility users, or residents**

Commercial licensing inquiries: `info@genexis.jp`

### ⚠️ Emergency & Life-Safety Disclaimer
- This software is provided **"AS IS" without warranty of any kind** as a supplementary self-help community tool. **It is NOT a substitute for official emergency services (such as 911, 112, or 119) or official evacuation orders.**
- In no event shall the authors or copyright holders be liable for any claim, damages, personal injury, loss of life, or property damage arising from communication outages, Google service downtime, misconfiguration, or delayed rescue during a disaster. Always maintain backup physical communication methods during emergencies.


---

## 🏢 Credits

- **Developed by**: **[Genesis LLC.](https://genexis.jp)** (`https://genexis.jp`)
- **Contact**: `info@genexis.jp`
- **Project Repository**: `https://github.com/genesis-jp/condo-safety-oss`
