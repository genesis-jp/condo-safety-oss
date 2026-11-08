/**
 * ============================================================================
 * 🏢 マンション・集合住宅 安否確認システム (Open Source Edition)
 * Condo / Apartment Resident Safety Check System — Google Apps Script Backend
 * ============================================================================
 *
 * [特徴 / Key Features]
 * 1. サーバー維持費ゼロ（管理組合・HOAの無料Googleアカウント1つで稼働）
 *    Zero hosting cost (Runs entirely on a single free Google Account).
 * 2. 理事・管理者の「Googleパスキー認証 ＋ 部屋番号1対1拘束」によるなりすまし防止
 *    Passkey / Google OAuth admin verification with strict 1-to-1 Email-to-Unit binding.
 * 3. Googleドライブ内への年度別自動整理（例: 「安否確認システム ＞ 2026年版」）
 *    Automatic annual folder organization in Google Drive (kept private to the board).
 * 4. すべての操作履歴をGoogleドライブ内の監査ログ（スプレッドシート ＆ CSV）へ自動記録
 *    Full audit trail recorded automatically to Google Sheets and Drive CSV.
 *
 * [★ 導入時のカスタマイズ箇所 / ★ CUSTOMIZE HERE FOR YOUR BUILDING]
 * 下記の `DEFAULT_CONFIG` ブロックのみ、ご自身のマンション・建物に合わせて書き換えてください。
 * Only edit the `DEFAULT_CONFIG` block below to match your building's configuration.
 * ============================================================================
 */

const DEFAULT_CONFIG = {
  // 1. マンション・建物名称 (Building / Condo Name)
  BUILDING_NAME_JA: 'サンプルレジデンス',
  BUILDING_NAME_EN: 'Sunrise Condominium',

  // 2. 現在の運用期・年度ラベル (Current Board Term / Fiscal Year)
  TERM_TITLE_JA: '2026年度 (第12期)',
  TERM_TITLE_EN: 'FY2026 (Term 12)',

  // 3. Googleドライブ内の保存フォルダ名 (Google Drive Folder Hierarchy)
  // ※マイドライブ直下に「安否確認システム > 2026年版」が自動作成されます（住民への共有は不要・非公開のままで動作します）
  DRIVE_ROOT_FOLDER_NAME: '安否確認システム',
  DRIVE_YEAR_FOLDER_NAME: '2026年版',
  DRIVE_DB_FILE_NAME: 'マンション安否確認データベース_2026年度',
  DRIVE_AUDIT_FILE_NAME: '操作監査ログ_2026年度.csv',

  // 4. 理事会・防災委員会のGoogleグループアドレス (Board Google Group Email)
  // ※Googleグループを使わない場合は空文字 '' でも、下記の ADMIN_ROOM_TO_EMAIL で1対1認証が動作します
  ADMIN_GOOGLE_GROUP: 'your-condo-board@googlegroups.com',

  // 5. 各階の戸数設定 (Floor Layout: { 階数: 戸数 })
  // 例: 7階建て・全97戸の場合。お住まいのマンションの階数・戸数に合わせて変更してください。
  FLOOR_CONFIG: { 7: 8, 6: 11, 5: 15, 4: 16, 3: 17, 2: 16, 1: 14 },

  // 6. 理事・管理者（役員）の「部屋番号 : Googleメールアドレス」1対1紐付けマスタ
  // ここに登録されたGoogleアカウントのみが管理者ダッシュボードに入室でき、必ず該当部屋番号に自動固定されます。
  ADMIN_ROOM_TO_EMAIL: {
    '103': 'board103@example.com',
    '202': 'board202@example.com',
    '301': 'board301@example.com',
    '317': 'board317@example.com',
    '401': 'board401@example.com',
    '413': 'board413@example.com',
    '501': 'board501@example.com',
    '513': 'board513@example.com',
    '514': 'board514@example.com',
    '610': 'board610@example.com',
    '611': 'board611@example.com'
  },

  // 7. 一般世帯への全体安否マップ（個人情報マスク済み）の閲覧公開初期値
  ALLOW_RESIDENT_PUBLIC_MAP: true
};

// スプレッドシート内のシート名定義 (Internal Sheet Names)
const SHEET_NAMES = {
  USERS: 'm_users',
  LOGS: 't_safety_logs',
  STATUS: 't_latest_status',
  SETTINGS: 'm_settings',
  AUDIT_LOGS: 't_audit_logs'
};

/**
 * Googleドライブ内の「安否確認システム ＞ 2026年版」フォルダを取得（未作成なら自動生成）
 * Gets or creates the annual folder inside Google Drive.
 */
function getOrCreateYearFolder() {
  const rootIter = DriveApp.getFoldersByName(DEFAULT_CONFIG.DRIVE_ROOT_FOLDER_NAME);
  const rootFolder = rootIter.hasNext()
    ? rootIter.next()
    : DriveApp.createFolder(DEFAULT_CONFIG.DRIVE_ROOT_FOLDER_NAME);

  const yearIter = rootFolder.getFoldersByName(DEFAULT_CONFIG.DRIVE_YEAR_FOLDER_NAME);
  const yearFolder = yearIter.hasNext()
    ? yearIter.next()
    : rootFolder.createFolder(DEFAULT_CONFIG.DRIVE_YEAR_FOLDER_NAME);

  return yearFolder;
}

/**
 * データベース用スプレッドシートを取得（未作成なら年度フォルダ内に自動生成）
 * Gets or creates the target Google Spreadsheet inside the annual folder.
 */
function getTargetSpreadsheet() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;

  const yearFolder = getOrCreateYearFolder();
  const props = PropertiesService.getScriptProperties();
  const propKey = 'SPREADSHEET_ID_' + DEFAULT_CONFIG.DRIVE_YEAR_FOLDER_NAME;
  const savedId = props.getProperty(propKey);

  if (savedId) {
    try {
      ss = SpreadsheetApp.openById(savedId);
      if (ss) {
        try { DriveApp.getFileById(ss.getId()).moveTo(yearFolder); } catch (ignore) {}
        return ss;
      }
    } catch (e) {}
  }

  const folderFiles = yearFolder.getFilesByName(DEFAULT_CONFIG.DRIVE_DB_FILE_NAME);
  if (folderFiles.hasNext()) {
    ss = SpreadsheetApp.open(folderFiles.next());
    props.setProperty(propKey, ss.getId());
    return ss;
  }

  const allFiles = DriveApp.getFilesByName(DEFAULT_CONFIG.DRIVE_DB_FILE_NAME);
  if (allFiles.hasNext()) {
    const file = allFiles.next();
    try { file.moveTo(yearFolder); } catch (ignore) {}
    ss = SpreadsheetApp.open(file);
    props.setProperty(propKey, ss.getId());
    return ss;
  }

  ss = SpreadsheetApp.create(DEFAULT_CONFIG.DRIVE_DB_FILE_NAME);
  try { DriveApp.getFileById(ss.getId()).moveTo(yearFolder); } catch (ignore) {}
  props.setProperty(propKey, ss.getId());
  return ss;
}

/**
 * Webアプリ画面の描画 (index.html を返す)
 * Serves the main web application HTML.
 */
function doGet(e) {
  initSpreadsheetIfNeeded();
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(DEFAULT_CONFIG.BUILDING_NAME_JA + ' 安否確認システム / ' + DEFAULT_CONFIG.BUILDING_NAME_EN + ' Safety Check')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 初期データの取得 (クライアント起動時に呼び出し)
 * Fetches initial household list, latest safety status, and system settings.
 */
function getInitialData() {
  initSpreadsheetIfNeeded();
  const ss = getTargetSpreadsheet();
  const statusSheet = ss.getSheetByName(SHEET_NAMES.STATUS);
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);

  const safetyAnswers = {};
  if (statusSheet && statusSheet.getLastRow() > 1) {
    const rows = statusSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const [roomNumber, lastUpdated, updatedBy, safetyStatus, memberCount, safeCount, isPowerOutage, isWaterOutage, memo, isProxy] = rows[i];
      if (roomNumber) {
        safetyAnswers[String(roomNumber)] = {
          roomNumber: String(roomNumber),
          lastUpdated: String(lastUpdated || ''),
          updatedBy: String(updatedBy || ''),
          safetyStatus: String(safetyStatus || '未回答'),
          memberCount: Number(memberCount || 1),
          safeCount: Number(safeCount || 0),
          isPowerOutage: Boolean(isPowerOutage),
          isWaterOutage: Boolean(isWaterOutage),
          memo: String(memo || ''),
          isProxy: Boolean(isProxy)
        };
      }
    }
  }

  const users = [];
  if (usersSheet && usersSheet.getLastRow() > 1) {
    const uRows = usersSheet.getDataRange().getValues();
    for (let i = 1; i < uRows.length; i++) {
      const [roomNumber, ownerName, primaryEmail, memberCount, pinCode, isAdmin, hasRegisteredEmail] = uRows[i];
      if (roomNumber) {
        users.push({
          roomNumber: String(roomNumber),
          ownerName: String(ownerName || ''),
          primaryEmail: String(primaryEmail || ''),
          memberCount: Number(memberCount || 2),
          pinCode: String(pinCode || ('0' + roomNumber)),
          isAdmin: Boolean(isAdmin),
          hasRegisteredEmail: Boolean(hasRegisteredEmail)
        });
      }
    }
  }

  let isTrainingMode = true;
  let announcement = '';
  let termTitle = DEFAULT_CONFIG.TERM_TITLE_JA;

  if (settingsSheet && settingsSheet.getLastRow() > 1) {
    const sRows = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < sRows.length; i++) {
      const [key, val] = sRows[i];
      if (key === 'TRAINING_MODE') isTrainingMode = (val === true || String(val).toLowerCase() === 'true');
      if (key === 'SYSTEM_ANNOUNCEMENT') announcement = String(val || '');
      if (key === 'TERM_TITLE') termTitle = String(val || DEFAULT_CONFIG.TERM_TITLE_JA);
    }
  }

  return {
    success: true,
    users: users,
    safetyAnswers: safetyAnswers,
    isTrainingMode: isTrainingMode,
    announcement: announcement,
    termTitle: termTitle
  };
}

/**
 * 管理者ログイン時のGoogleアカウント1対1照合（他室の選択・なりすまし防止）
 * Verifies whether the Google email is registered as an Admin and returns its 1-to-1 bound Unit Number.
 */
function verifyAdminRoleByGoogleSession(clientEmailInput) {
  const sessionEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const targetEmail = sessionEmail || String(clientEmailInput || '').trim().toLowerCase();

  if (!targetEmail) {
    return { isAdmin: false, email: '', roomNumber: null, reason: 'NO_EMAIL' };
  }

  // 1. スプレッドシートの m_users シートからメールアドレスで部屋番号を1対1逆引き
  const ss = getTargetSpreadsheet();
  const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  let matchedRoom = null;

  if (usersSheet && usersSheet.getLastRow() > 1) {
    const rows = usersSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const room = String(rows[i][0]).trim();
      const email = String(rows[i][2]).trim().toLowerCase();
      const isAdmin = Boolean(rows[i][5]);
      if (isAdmin && email && email === targetEmail) {
        matchedRoom = room;
        break;
      }
    }
  }

  // 2. DEFAULT_CONFIG.ADMIN_ROOM_TO_EMAIL からのフォールバック照合
  if (!matchedRoom) {
    for (const r in DEFAULT_CONFIG.ADMIN_ROOM_TO_EMAIL) {
      if (String(DEFAULT_CONFIG.ADMIN_ROOM_TO_EMAIL[r]).trim().toLowerCase() === targetEmail) {
        matchedRoom = r;
        break;
      }
    }
  }

  if (!matchedRoom) {
    return { isAdmin: false, email: targetEmail, roomNumber: null, reason: 'NOT_IN_ADMIN_MAP' };
  }

  // 3. Googleグループが設定されている場合はメンバーシップも確認（任意）
  if (DEFAULT_CONFIG.ADMIN_GOOGLE_GROUP && DEFAULT_CONFIG.ADMIN_GOOGLE_GROUP.indexOf('example') === -1 && DEFAULT_CONFIG.ADMIN_GOOGLE_GROUP.indexOf('your-condo') === -1) {
    try {
      const group = GroupsApp.getGroupByEmail(DEFAULT_CONFIG.ADMIN_GOOGLE_GROUP);
      if (group && !group.hasUser(targetEmail)) {
        return { isAdmin: false, email: targetEmail, roomNumber: null, reason: 'NOT_IN_GOOGLE_GROUP' };
      }
    } catch (e) {
      // GroupsApp の権限外環境ではマスタの1対1一致を採用
    }
  }

  return {
    isAdmin: true,
    email: targetEmail,
    roomNumber: matchedRoom
  };
}

/**
 * 安否回答の登録・上書き保存（住民自己申告 および 管理者による代行入力の両対応）
 * Saves or updates a household's safety status (supports both resident self-report and admin proxy override).
 */
function submitSafetyAnswer(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getTargetSpreadsheet();
    const statusSheet = ss.getSheetByName(SHEET_NAMES.STATUS);
    const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    const roomStr = String(payload.roomNumber);
    const updatedBy = String(payload.updatedBy || ('Room ' + roomStr));
    const status = String(payload.safetyStatus || '無事');
    const memberCount = Number(payload.memberCount || 1);
    const safeCount = Number(payload.safeCount || 0);
    const isPower = Boolean(payload.isPowerOutage);
    const isWater = Boolean(payload.isWaterOutage);
    const memo = String(payload.memo || '');
    const isProxy = Boolean(payload.isProxy);

    // 1. 履歴シート (t_safety_logs) へ追記
    if (logSheet) {
      logSheet.appendRow([
        Utilities.getUuid(),
        nowStr,
        roomStr,
        updatedBy,
        status,
        memberCount,
        safeCount,
        isPower,
        isWater,
        memo,
        isProxy
      ]);
    }

    // 2. 最新状態シート (t_latest_status) の該当部屋を上書き
    if (statusSheet) {
      const rows = statusSheet.getDataRange().getValues();
      let foundRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === roomStr) {
          foundRowIndex = i + 1;
          break;
        }
      }
      const rowValues = [roomStr, nowStr, updatedBy, status, memberCount, safeCount, isPower, isWater, memo, isProxy];
      if (foundRowIndex > 0) {
        statusSheet.getRange(foundRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        statusSheet.appendRow(rowValues);
      }
    }

    return { success: true, timestamp: nowStr };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 訓練モード切替 / Toggles drill vs. real emergency mode
 */
function toggleTrainingMode(isTraining) {
  upsertSetting('TRAINING_MODE', Boolean(isTraining));
  return { success: true };
}

/**
 * お知らせメッセージ更新 / Updates HQ announcement banner
 */
function updateAnnouncement(msg) {
  upsertSetting('SYSTEM_ANNOUNCEMENT', String(msg));
  return { success: true };
}

/**
 * 全回答リセット（訓練開始前・終了後用） / Resets all safety responses
 */
function resetAllAnswers() {
  const ss = getTargetSpreadsheet();
  const statusSheet = ss.getSheetByName(SHEET_NAMES.STATUS);
  if (statusSheet && statusSheet.getLastRow() > 1) {
    statusSheet.getRange(2, 1, statusSheet.getLastRow() - 1, statusSheet.getLastColumn()).clearContent();
  }
  return { success: true };
}

function upsertSetting(key, value) {
  const ss = getTargetSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

/**
 * 操作監査ログの記録（Googleドライブ内スプレッドシート ＆ 年度フォルダ内CSVへ自動保存）
 * Records an audit log entry to both the `t_audit_logs` sheet and the Drive CSV file.
 */
function recordAuditLog(entry) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    const activeGoogleUser = String(Session.getActiveUser().getEmail() || '');
    const rowData = [
      Utilities.getUuid(),
      nowStr,
      String(entry.term || DEFAULT_CONFIG.TERM_TITLE_JA),
      String(entry.mode || '訓練/Drill'),
      String(entry.actionType || 'UNKNOWN'),
      String(entry.actor || activeGoogleUser || 'Unknown'),
      String(entry.targetRoom || '-'),
      String(entry.detail || '')
    ];

    const ss = getTargetSpreadsheet();
    if (ss) {
      let auditSheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS);
      if (!auditSheet) {
        auditSheet = ss.insertSheet(SHEET_NAMES.AUDIT_LOGS);
        auditSheet.appendRow(['audit_id', 'timestamp', 'term', 'mode', 'action_type', 'actor', 'target_room', 'detail']);
      }
      auditSheet.appendRow(rowData);
    }

    appendAuditLogToDriveCsv(rowData);
    return { success: true };
  } catch (e) {
    console.warn('Audit log write warning: ' + e.toString());
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 年度フォルダ内へ監査ログCSVを自動生成・追記
 */
function appendAuditLogToDriveCsv(rowData) {
  try {
    const folder = getOrCreateYearFolder();
    const csvLine = rowData.map(function(col) {
      return '"' + String(col).replace(/"/g, '""') + '"';
    }).join(',') + '\r\n';

    const fileIter = folder.getFilesByName(DEFAULT_CONFIG.DRIVE_AUDIT_FILE_NAME);
    if (fileIter.hasNext()) {
      const file = fileIter.next();
      const currentContent = file.getBlob().getDataAsString('UTF-8');
      file.setContent(currentContent + csvLine);
    } else {
      const header = '"audit_id","timestamp","term","mode","action_type","actor","target_room","detail"\r\n';
      folder.createFile(DEFAULT_CONFIG.DRIVE_AUDIT_FILE_NAME, '\uFEFF' + header + csvLine, MimeType.CSV);
    }
  } catch (e) {
    console.warn('Drive CSV append skipped: ' + e.toString());
  }
}

/**
 * 初回起動時にスプレッドシートの各シートと初期マスタを自動構築
 * Initializes all required sheets and sample unit data on first run.
 */
function initSpreadsheetIfNeeded() {
  const ss = getTargetSpreadsheet();
  if (!ss) return;

  if (!ss.getSheetByName(SHEET_NAMES.USERS)) {
    const u = ss.insertSheet(SHEET_NAMES.USERS);
    u.appendRow(['room_number', 'owner_name', 'primary_email', 'member_count', 'pin_code', 'is_admin', 'has_registered_email']);

    const adminEmails = DEFAULT_CONFIG.ADMIN_ROOM_TO_EMAIL;
    const floorConfig = DEFAULT_CONFIG.FLOOR_CONFIG;
    const floors = Object.keys(floorConfig).map(Number).sort(function(a, b) { return a - b; });

    for (let idx = 0; idx < floors.length; idx++) {
      const f = floors[idx];
      const count = floorConfig[f];
      for (let i = 1; i <= count; i++) {
        const room = f + (i < 10 ? '0' + i : '' + i);
        const isAdmin = Boolean(adminEmails[room]);
        // サンプルとして約8割の世帯をメール登録済みとして初期化（スプレッドシート上で自由に変更可能）
        const hasReg = isAdmin || ((i % 5) !== 0);
        const email = adminEmails[room] || '';
        u.appendRow([room, '', email, 2, '0' + room, isAdmin, hasReg]);
      }
    }
  }

  if (!ss.getSheetByName(SHEET_NAMES.STATUS)) {
    const s = ss.insertSheet(SHEET_NAMES.STATUS);
    s.appendRow(['room_number', 'last_updated', 'updated_by', 'safety_status', 'member_count', 'safe_count', 'is_power_outage', 'is_water_outage', 'memo', 'is_proxy']);
  }

  if (!ss.getSheetByName(SHEET_NAMES.LOGS)) {
    const l = ss.insertSheet(SHEET_NAMES.LOGS);
    l.appendRow(['log_id', 'timestamp', 'room_number', 'updated_by', 'safety_status', 'member_count', 'safe_count', 'is_power_outage', 'is_water_outage', 'memo', 'is_proxy']);
  }

  if (!ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS)) {
    const a = ss.insertSheet(SHEET_NAMES.AUDIT_LOGS);
    a.appendRow(['audit_id', 'timestamp', 'term', 'mode', 'action_type', 'actor', 'target_room', 'detail']);
  }

  if (!ss.getSheetByName(SHEET_NAMES.SETTINGS)) {
    const st = ss.insertSheet(SHEET_NAMES.SETTINGS);
    st.appendRow(['key', 'value']);
    st.appendRow(['TERM_TITLE', DEFAULT_CONFIG.TERM_TITLE_JA]);
    st.appendRow(['TRAINING_MODE', true]);
    st.appendRow(['SYSTEM_ANNOUNCEMENT', '【防災訓練 / Safety Drill】現在、大規模地震を想定したマンション安否確認訓練を実施中です。各世帯は速やかに安否状況を報告してください。']);
  }

  const defaultSheet = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}
