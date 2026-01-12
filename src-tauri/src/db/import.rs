use csv::ReaderBuilder;
use sha2::{Digest, Sha256};
use rusqlite::Connection;

use super::models::ImportResult;
use super::{categories, transactions};
use super::models::Transaction;

/// Import a Danish bank CSV file.
/// 
/// Expected columns (semicolon-delimited):
/// Dato, Kategori, Underkategori, Tekst, Beløb, Saldo, Status, Afstemt
/// 
/// Returns the number of rows processed, imported, and skipped.
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
            log_import(conn, filename, comma_result.as_ref().unwrap().imported)?;
            return comma_result;
        }
    }
    
    if let Ok(ref res) = result {
        log_import(conn, filename, res.imported)?;
    }
    
    result
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

    let headers = reader.headers().map_err(|e| e.to_string())?.clone();
    
    // Find column indices by header name (case-insensitive)
    let date_idx = find_column_index(&headers, &["dato", "date"]);
    let category_idx = find_column_index(&headers, &["kategori", "category"]);
    let subcategory_idx = find_column_index(&headers, &["underkategori", "subcategory"]);
    let text_idx = find_column_index(&headers, &["tekst", "text", "description", "payee"]);
    let amount_idx = find_column_index(&headers, &["beløb", "belob", "amount"]);
    let balance_idx = find_column_index(&headers, &["saldo", "balance"]);
    let status_idx = find_column_index(&headers, &["status"]);
    let reconciled_idx = find_column_index(&headers, &["afstemt", "reconciled"]);

    // Validate required columns
    let date_idx = date_idx.ok_or("Could not find date column (Dato)")?;
    let text_idx = text_idx.ok_or("Could not find text column (Tekst)")?;
    let amount_idx = amount_idx.ok_or("Could not find amount column (Beløb)")?;

    let mut total_rows = 0;
    let mut imported = 0;
    let mut skipped = 0;

    for result in reader.records() {
        let record = result.map_err(|e| e.to_string())?;
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
            let parent_id = categories::find_or_create(conn, cat_name, None)
                .map_err(|e| e.to_string())?;
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
        return Err("Empty date".to_string());
    }

    // Split by common separators
    let parts: Vec<&str> = s.split(['-', '/', '.'].as_ref()).collect();
    
    if parts.len() != 3 {
        return Err(format!("Invalid date format: {}", s));
    }

    let day: u32 = parts[0].parse().map_err(|_| format!("Invalid day: {}", parts[0]))?;
    let month: u32 = parts[1].parse().map_err(|_| format!("Invalid month: {}", parts[1]))?;
    let year: u32 = parts[2].parse().map_err(|_| format!("Invalid year: {}", parts[2]))?;

    // Basic validation
    if month < 1 || month > 12 {
        return Err(format!("Invalid month: {}", month));
    }
    if day < 1 || day > 31 {
        return Err(format!("Invalid day: {}", day));
    }

    Ok(format!("{:04}-{:02}-{:02}", year, month, day))
}

/// Parse Danish amount format (uses comma as decimal separator) to øre (integer cents)
/// Examples: "125,50" -> 12550, "-1.234,56" -> -123456, "1234" -> 123400
fn parse_danish_amount(s: &str) -> Result<i64, String> {
    let s = s.trim();
    if s.is_empty() {
        return Err("Empty amount".to_string());
    }

    // Remove thousand separators (.) and replace decimal comma with dot
    let cleaned = s
        .replace(".", "")    // Remove thousand separators
        .replace(",", ".");  // Convert decimal comma to dot

    let amount: f64 = cleaned
        .parse()
        .map_err(|_| format!("Invalid amount: {}", s))?;

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_danish_date() {
        assert_eq!(parse_danish_date("12-01-2026").unwrap(), "2026-01-12");
        assert_eq!(parse_danish_date("31/12/2025").unwrap(), "2025-12-31");
        assert_eq!(parse_danish_date("01.06.2024").unwrap(), "2024-06-01");
    }

    #[test]
    fn test_parse_danish_amount() {
        assert_eq!(parse_danish_amount("125,50").unwrap(), 12550);
        assert_eq!(parse_danish_amount("-125,50").unwrap(), -12550);
        assert_eq!(parse_danish_amount("1.234,56").unwrap(), 123456);
        assert_eq!(parse_danish_amount("-1.234,56").unwrap(), -123456);
        assert_eq!(parse_danish_amount("1234").unwrap(), 123400);
    }
}
