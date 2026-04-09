
/**
 * CustodyX.AI Backend
 * Handles User Auth, Data Persistence (Reports, Documents, Profile), and Messaging.
 */

// --- CONFIGURATION ---
var SCRIPT_PROP = PropertiesService.getScriptProperties();
var SHEET_NAMES = {
  USERS: 'Users',
  REPORTS: 'Reports',
  DOCUMENTS: 'Documents',
  PROFILE: 'Profiles',
  MESSAGES: 'Messages',
  TEMPLATES: 'Templates'
};

// --- INITIAL SETUP ---
function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  createSheetIfNotExists(doc, SHEET_NAMES.USERS, ['id', 'email', 'password_hash', 'created_at']);
  createSheetIfNotExists(doc, SHEET_NAMES.REPORTS, ['id', 'user_id', 'data', 'updated_at', 'is_deleted']);
  createSheetIfNotExists(doc, SHEET_NAMES.DOCUMENTS, ['id', 'user_id', 'meta', 'content_chunks', 'updated_at', 'is_deleted']);
  createSheetIfNotExists(doc, SHEET_NAMES.PROFILE, ['user_id', 'data', 'updated_at']);
  createSheetIfNotExists(doc, SHEET_NAMES.MESSAGES, ['id', 'user_id', 'role', 'content', 'timestamp']);
  createSheetIfNotExists(doc, SHEET_NAMES.TEMPLATES, ['id', 'user_id', 'data', 'updated_at', 'is_deleted']);
  return 'Setup Complete';
}

function createSheetIfNotExists(doc, name, headers) {
  var sheet = doc.getSheetByName(name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    sheet.appendRow(headers);
  }
}

// --- HTTP HANDLERS ---

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var action = e.parameter.action;
    var params = e.parameter;
    var postData = e.postData ? JSON.parse(e.postData.contents) : {};
    
    // Merge postData into params for easier access
    for (var key in postData) {
      params[key] = postData[key];
    }

    var result = {};

    switch (action) {
      case 'signup':
        result = registerUser(params.email, params.password);
        break;
      case 'login':
        result = loginUser(params.email, params.password);
        break;
      case 'sync':
        result = syncData(params.userId, params.lastSync);
        break;
      case 'saveItems':
        result = saveItems(params.userId, params.type, params.items);
        break;
      case 'sendMessage':
        result = sendMessage(params.userId, params.content, params.role);
        break;
      case 'getMessages':
        result = getMessages(params.userId, params.after);
        break;
      default:
        result = { status: 'error', message: 'Unknown action' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- AUTHENTICATION ---

function registerUser(email, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
  var data = sheet.getDataRange().getValues();
  
  // Check if email exists
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === email) {
      return { status: 'error', message: 'User already exists' };
    }
  }

  var newId = Utilities.getUuid();
  // Simple hash for demonstration. In production, use a library or better auth mechanism.
  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password));
  
  sheet.appendRow([newId, email, hash, new Date()]);
  
  return { status: 'success', userId: newId, email: email };
}

function loginUser(email, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
  var data = sheet.getDataRange().getValues();
  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password));

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === email && data[i][2] === hash) {
      return { status: 'success', userId: data[i][0], email: email };
    }
  }
  return { status: 'error', message: 'Invalid credentials' };
}

// --- DATA SYNC ---

function syncData(userId, lastSync) {
  if (!userId) return { status: 'error', message: 'Missing userId' };
  
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    reports: getItemsForUser(doc, SHEET_NAMES.REPORTS, userId),
    templates: getItemsForUser(doc, SHEET_NAMES.TEMPLATES, userId),
    profile: getItemsForUser(doc, SHEET_NAMES.PROFILE, userId)[0] || null,
    documents: getItemsForUser(doc, SHEET_NAMES.DOCUMENTS, userId, true) // Pass true to handle chunks if necessary
  };

  return { status: 'success', data: result };
}

function getItemsForUser(doc, sheetName, userId, isDocument) {
  var sheet = doc.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var items = [];
  var headers = data[0]; // Assume row 0 is headers
  
  // Find column indexes
  var idIdx = headers.indexOf('id');
  var userIdx = headers.indexOf('user_id');
  var dataIdx = headers.indexOf('data');
  var delIdx = headers.indexOf('is_deleted');
  
  // Special handling for documents which might use 'meta' and 'content_chunks'
  var metaIdx = headers.indexOf('meta');
  var contentIdx = headers.indexOf('content_chunks');

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[userIdx]) === String(userId)) {
      if (delIdx > -1 && row[delIdx] === true) continue; // Skip deleted

      try {
        if (isDocument) {
           var meta = JSON.parse(row[metaIdx]);
           // In a real app, you might lazily load content. For now, we return it.
           // Warning: Large base64 strings might hit cell limits.
           var content = row[contentIdx];
           items.push({
             ...meta,
             data: content // This maps to the 'data' field in StoredDocument
           });
        } else if (sheetName === SHEET_NAMES.PROFILE) {
           items.push(JSON.parse(row[dataIdx]));
        } else {
           // Reports, Templates
           items.push(JSON.parse(row[dataIdx]));
        }
      } catch (err) {
        // Ignore parsing errors for robust loop
      }
    }
  }
  return items;
}

function saveItems(userId, type, items) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName;
  
  switch(type) {
    case 'reports': sheetName = SHEET_NAMES.REPORTS; break;
    case 'templates': sheetName = SHEET_NAMES.TEMPLATES; break;
    case 'documents': sheetName = SHEET_NAMES.DOCUMENTS; break;
    case 'profile': sheetName = SHEET_NAMES.PROFILE; break;
    default: return { status: 'error', message: 'Invalid type' };
  }

  var sheet = doc.getSheetByName(sheetName);
  
  // For profile, we just upsert the single row for the user
  if (type === 'profile') {
    upsertProfile(sheet, userId, items[0]); // items is array, profile passed as single obj usually
    return { status: 'success' };
  }

  // For others, we loop
  items.forEach(function(item) {
    upsertItem(sheet, userId, item, type === 'documents');
  });

  return { status: 'success' };
}

function upsertProfile(sheet, userId, profileData) {
  var data = sheet.getDataRange().getValues();
  var rowIdx = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      rowIdx = i + 1;
      break;
    }
  }

  var json = JSON.stringify(profileData);
  if (rowIdx > -1) {
    sheet.getRange(rowIdx, 2).setValue(json);
    sheet.getRange(rowIdx, 3).setValue(new Date());
  } else {
    sheet.appendRow([userId, json, new Date()]);
  }
}

function upsertItem(sheet, userId, item, isDocument) {
  var data = sheet.getDataRange().getValues();
  var itemId = item.id;
  var rowIdx = -1;

  // Find existing row
  for (var i = 1; i < data.length; i++) {
    // Column 0 is usually ID, except for documents it might be slightly different logic 
    // but based on setup(), col 0 is id for reports/docs/templates
    if (String(data[i][0]) === String(itemId)) {
      rowIdx = i + 1;
      break;
    }
  }
  
  var timestamp = new Date();
  
  if (isDocument) {
    // Split item into meta (id, name, mimeType, etc) and content (base64 data)
    var content = item.data;
    var meta = {
       id: item.id,
       name: item.name,
       mimeType: item.mimeType,
       createdAt: item.createdAt,
       folder: item.folder,
       structuredData: item.structuredData
    };
    
    if (rowIdx > -1) {
      sheet.getRange(rowIdx, 3).setValue(JSON.stringify(meta));
      sheet.getRange(rowIdx, 4).setValue(content); // Update content
      sheet.getRange(rowIdx, 5).setValue(timestamp);
      sheet.getRange(rowIdx, 6).setValue(false); // is_deleted
    } else {
      sheet.appendRow([itemId, userId, JSON.stringify(meta), content, timestamp, false]);
    }
  } else {
    // Reports/Templates
    var json = JSON.stringify(item);
    if (rowIdx > -1) {
      sheet.getRange(rowIdx, 3).setValue(json);
      sheet.getRange(rowIdx, 4).setValue(timestamp);
      sheet.getRange(rowIdx, 5).setValue(false); // is_deleted
    } else {
      sheet.appendRow([itemId, userId, json, timestamp, false]);
    }
  }
}

// --- MESSAGING ---

function sendMessage(userId, content, role) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MESSAGES);
  var id = Utilities.getUuid();
  var timestamp = new Date().toISOString();
  sheet.appendRow([id, userId, role, content, timestamp]);
  return { status: 'success', message: { id: id, role: role, content: content, timestamp: timestamp } };
}

function getMessages(userId, after) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MESSAGES);
  var data = sheet.getDataRange().getValues();
  var messages = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Check user ID match
    if (String(row[1]) === String(userId)) {
      var ts = row[4];
      // Simple string comparison for ISO dates often works, or parse
      if (!after || ts > after) {
        messages.push({
          id: row[0],
          role: row[2],
          content: row[3],
          timestamp: ts
        });
      }
    }
  }
  
  return { status: 'success', messages: messages };
}
