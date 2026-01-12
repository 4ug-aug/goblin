use rusqlite::{params, Connection, OptionalExtension};
use super::models::{Transaction, TransactionWithCategory};

pub fn create(conn: &Connection, tx: &Transaction) -> Result<i64, rusqlite::Error> {
    conn.execute(
        r#"INSERT INTO transactions 
           (account_id, category_id, date, payee, amount, balance_snapshot, status, is_reconciled, import_hash)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
        params![
            tx.account_id,
            tx.category_id,
            tx.date,
            tx.payee,
            tx.amount,
            tx.balance_snapshot,
            tx.status,
            tx.is_reconciled as i64,
            tx.import_hash,
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Option<Transaction>, rusqlite::Error> {
    conn.query_row(
        r#"SELECT id, account_id, category_id, date, payee, amount, 
           balance_snapshot, status, is_reconciled, import_hash
           FROM transactions WHERE id = ?1"#,
        params![id],
        |row| {
            Ok(Transaction {
                id: Some(row.get(0)?),
                account_id: row.get(1)?,
                category_id: row.get(2)?,
                date: row.get(3)?,
                payee: row.get(4)?,
                amount: row.get(5)?,
                balance_snapshot: row.get(6)?,
                status: row.get(7)?,
                is_reconciled: row.get::<_, i64>(8)? != 0,
                import_hash: row.get(9)?,
            })
        },
    )
    .optional()
}

/// Get transactions for an account with optional limit
pub fn get_by_account(
    conn: &Connection,
    account_id: i64,
    limit: Option<i64>,
) -> Result<Vec<TransactionWithCategory>, rusqlite::Error> {
    let sql = format!(
        r#"SELECT 
            t.id, t.account_id, t.category_id, t.date, t.payee, t.amount, 
            t.balance_snapshot, t.status, t.is_reconciled, t.import_hash,
            c.name as category_name,
            p.name as parent_category_name
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id
           LEFT JOIN categories p ON c.parent_id = p.id
           WHERE t.account_id = ?1
           ORDER BY t.date DESC, t.id DESC
           {}"#,
        limit.map(|l| format!("LIMIT {}", l)).unwrap_or_default()
    );

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![account_id], map_transaction_with_category)?;
    rows.collect()
}

/// Get transactions within a date range
pub fn get_by_date_range(
    conn: &Connection,
    account_id: i64,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<TransactionWithCategory>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        r#"SELECT 
            t.id, t.account_id, t.category_id, t.date, t.payee, t.amount, 
            t.balance_snapshot, t.status, t.is_reconciled, t.import_hash,
            c.name as category_name,
            p.name as parent_category_name
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id
           LEFT JOIN categories p ON c.parent_id = p.id
           WHERE t.account_id = ?1 AND t.date >= ?2 AND t.date <= ?3
           ORDER BY t.date DESC, t.id DESC"#,
    )?;
    let rows = stmt.query_map(
        params![account_id, start_date, end_date],
        map_transaction_with_category,
    )?;
    rows.collect()
}

/// Get spending by category for a date range (for reports)
pub fn get_spending_by_category(
    conn: &Connection,
    account_id: i64,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<(String, i64)>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        r#"SELECT 
            COALESCE(p.name, c.name, 'Uncategorized') as category,
            SUM(t.amount) as total
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id
           LEFT JOIN categories p ON c.parent_id = p.id
           WHERE t.account_id = ?1 AND t.date >= ?2 AND t.date <= ?3 AND t.amount < 0
           GROUP BY category
           ORDER BY total ASC"#,
    )?;
    let rows = stmt.query_map(params![account_id, start_date, end_date], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?;
    rows.collect()
}

/// Check if a transaction with this import hash already exists
pub fn exists_by_hash(conn: &Connection, hash: &str) -> Result<bool, rusqlite::Error> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM transactions WHERE import_hash = ?1",
        params![hash],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

pub fn update_category(
    conn: &Connection,
    transaction_id: i64,
    category_id: Option<i64>,
) -> Result<usize, rusqlite::Error> {
    conn.execute(
        "UPDATE transactions SET category_id = ?1 WHERE id = ?2",
        params![category_id, transaction_id],
    )
}

pub fn delete(conn: &Connection, id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM transactions WHERE id = ?1", params![id])
}

pub fn delete_by_account(conn: &Connection, account_id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM transactions WHERE account_id = ?1", params![account_id])
}

fn map_transaction_with_category(
    row: &rusqlite::Row,
) -> Result<TransactionWithCategory, rusqlite::Error> {
    Ok(TransactionWithCategory {
        transaction: Transaction {
            id: Some(row.get(0)?),
            account_id: row.get(1)?,
            category_id: row.get(2)?,
            date: row.get(3)?,
            payee: row.get(4)?,
            amount: row.get(5)?,
            balance_snapshot: row.get(6)?,
            status: row.get(7)?,
            is_reconciled: row.get::<_, i64>(8)? != 0,
            import_hash: row.get(9)?,
        },
        category_name: row.get(10)?,
        parent_category_name: row.get(11)?,
    })
}
