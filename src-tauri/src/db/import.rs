use csv::ReaderBuilder;
use encoding_rs::WINDOWS_1252;
use rusqlite::Connection;
use sha2::{Digest, Sha256};

use super::models::ImportResult;
use super::models::Transaction;
use super::{categories, transactions};

/// Import a Danish bank CSV file from a UTF-8 string.
pub fn import_csv(
    conn: &Connection,
    csv_content: &str,
    account_id: i64,
    filename: &str,
) -> Result<ImportResult, String> {
    // Try semicolon delimiter first (common in Danish exports), fall back to comma
    let result = try_import_with_delimiter(conn, csv_content, account_id, b';');

    if result.is_err() {
        // Try comma delimiter as fallback
        let comma_result = try_import_with_delimiter(conn, csv_content, account_id, b',');
        if comma_result.is_ok() {
            let res = comma_result.unwrap();
            log_import(conn, filename, res.imported)?;
            return Ok(res);
        }
    }

    if let Ok(ref res) = result {
        log_import(conn, filename, res.imported)?;
    }

    result
}

/// Import CSV from raw bytes (handles encoding detection)
pub fn import_csv_bytes(
    conn: &Connection,
    bytes: &[u8],
    account_id: i64,
    filename: &str,
) -> Result<ImportResult, String> {
    // 1. Try UTF-8 (Strict)
    if let Ok(utf8_str) = std::str::from_utf8(bytes) {
        return import_csv(conn, utf8_str, account_id, filename);
    }

    // 2. Try Windows-1252 (Common for Danish banks)
    let (decoded, _encoding_used, _had_errors) = WINDOWS_1252.decode(bytes);
    
    // Even if there were minor errors, it's likely better than nothing for bank files
    // as Latin-1/Windows-1252 mostly always "decodes" something.
    import_csv(conn, &decoded, account_id, filename)
}

fn try_import_with_delimiter(
    conn: &Connection,
    csv_content: &str,
    account_id: i64,
    delimiter: u8,
) -> Result<ImportResult, String> {
    let mut reader = ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true) // Allow varying number of fields
        .trim(csv::Trim::All)
        .from_reader(csv_content.as_bytes());

    let headers = reader.headers().map_err(|e| format!("Kunne ikke læse overskrifter: {}", e))?.clone();

    // Find column indices by header name (case-insensitive)
    let date_idx = find_column_index(&headers, &["dato", "date"]);
    let category_idx = find_column_index(&headers, &["kategori", "category"]);
    let subcategory_idx = find_column_index(&headers, &["underkategori", "subcategory"]);
    let text_idx = find_column_index(&headers, &["tekst", "text", "description", "payee"]);
    let amount_idx = find_column_index(&headers, &["beløb", "belob", "bel", "amount"]);
    let balance_idx = find_column_index(&headers, &["saldo", "balance"]);
    let status_idx = find_column_index(&headers, &["status"]);
    let reconciled_idx = find_column_index(&headers, &["afstemt", "reconciled"]);

    // Validate required columns
    let date_idx = date_idx.ok_or_else(|| format!("Kunne ikke finde kolonnen 'Dato'. Fundne overskrifter: {:?}", headers))?;
    let text_idx = text_idx.ok_or_else(|| format!("Kunne ikke finde kolonnen 'Tekst' eller 'Payee'. Fundne overskrifter: {:?}", headers))?;
    let amount_idx = amount_idx.ok_or_else(|| format!("Kunne ikke finde kolonnen 'Beløb'. Fundne overskrifter: {:?}", headers))?;

    let mut total_rows = 0;
    let mut imported = 0;
    let mut skipped = 0;

    for result in reader.records() {
        let record = result.map_err(|e| format!("Fejl i CSV række {}: {}", total_rows + 1, e))?;
        total_rows += 1;

        // Parse required fields
        let date = parse_danish_date(record.get(date_idx).unwrap_or(""))?;
        let payee = record.get(text_idx).unwrap_or("").trim().to_string();
        let amount = parse_danish_amount(record.get(amount_idx).unwrap_or(""))?;

        // Parse optional fields
        let kategori = category_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());
        let underkategori = subcategory_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());
        let balance = balance_idx
            .and_then(|i| record.get(i))
            .and_then(|s| parse_danish_amount(s).ok());
        let status = status_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let is_reconciled = reconciled_idx
            .and_then(|i| record.get(i))
            .map(|s| {
                let lower = s.trim().to_lowercase();
                lower == "ja" || lower == "yes" || lower == "true" || lower == "1"
            })
            .unwrap_or(false);

        // Generate import hash for deduplication
        let hash = generate_import_hash(&date, &payee, amount, balance);

        // Skip if already imported
        if transactions::exists_by_hash(conn, &hash).map_err(|e| e.to_string())? {
            skipped += 1;
            continue;
        }

        // Find or create categories
        let category_id = if let Some(cat_name) = kategori {
            let parent_id =
                categories::find_or_create(conn, cat_name, None).map_err(|e| e.to_string())?;
            if let Some(subcat_name) = underkategori {
                Some(
                    categories::find_or_create(conn, subcat_name, Some(parent_id))
                        .map_err(|e| e.to_string())?,
                )
            } else {
                Some(parent_id)
            }
        } else {
            None
        };

        // Insert transaction
        let tx = Transaction {
            id: None,
            account_id,
            category_id,
            date,
            payee,
            amount,
            balance_snapshot: balance,
            status,
            is_reconciled,
            import_hash: Some(hash),
        };

        transactions::create(conn, &tx).map_err(|e| e.to_string())?;
        imported += 1;
    }

    Ok(ImportResult {
        total_rows,
        imported,
        skipped_duplicates: skipped,
    })
}

fn find_column_index(headers: &csv::StringRecord, names: &[&str]) -> Option<usize> {
    for (i, header) in headers.iter().enumerate() {
        let header_lower = header.to_lowercase();
        for name in names {
            if header_lower.contains(name) {
                return Some(i);
            }
        }
    }
    None
}

/// Parse Danish date format (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY) to ISO8601 (YYYY-MM-DD)
fn parse_danish_date(s: &str) -> Result<String, String> {
    let s = s.trim();
    if s.is_empty() {
        return Err("Dato mangler".to_string());
    }

    // Split by common separators
    let parts: Vec<&str> = s.split(['-', '/', '.'].as_ref()).collect();

    if parts.len() != 3 {
        return Err(format!("Ugyldigt datoformat: {}", s));
    }

    let day: u32 = parts[0]
        .parse()
        .map_err(|_| format!("Ugyldig dag: {}", parts[0]))?;
    let month: u32 = parts[1]
        .parse()
        .map_err(|_| format!("Ugyldig måned: {}", parts[1]))?;
    let year: u32 = parts[2]
        .parse()
        .map_err(|_| format!("Ugyldigt år: {}", parts[2]))?;

    // Basic validation
    if month < 1 || month > 12 {
        return Err(format!("Ugyldig måned: {}", month));
    }
    if day < 1 || day > 31 {
        return Err(format!("Ugyldig dag: {}", day));
    }

    Ok(format!("{:04}-{:02}-{:02}", year, month, day))
}

/// Parse Danish amount format (uses comma as decimal separator) to øre (integer cents)
fn parse_danish_amount(s: &str) -> Result<i64, String> {
    let s = s.trim();
    if s.is_empty() {
        return Err("Beløb mangler".to_string());
    }

    // Remove thousand separators (.) and replace decimal comma with dot
    let cleaned = s
        .replace(".", "") // Remove thousand separators
        .replace(",", "."); // Convert decimal comma to dot

    let amount: f64 = cleaned
        .parse()
        .map_err(|_| format!("Ugyldigt beløb: {}", s))?;

    // Convert to øre (cents) - multiply by 100 and round
    Ok((amount * 100.0).round() as i64)
}

/// Generate SHA-256 hash of transaction fields for deduplication
fn generate_import_hash(date: &str, payee: &str, amount: i64, balance: Option<i64>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(date.as_bytes());
    hasher.update(payee.as_bytes());
    hasher.update(amount.to_le_bytes());
    if let Some(b) = balance {
        hasher.update(b.to_le_bytes());
    }
    format!("{:x}", hasher.finalize())
}

fn log_import(conn: &Connection, filename: &str, records_added: usize) -> Result<(), String> {
    conn.execute(
        "INSERT INTO import_log (filename, records_added) VALUES (?1, ?2)",
        rusqlite::params![filename, records_added as i64],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
