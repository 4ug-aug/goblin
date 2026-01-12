use rusqlite::{params, Connection};
use super::models::Subscription;

/// Create a new subscription and link its transactions
pub fn create(conn: &Connection, sub: &Subscription) -> Result<i64, rusqlite::Error> {
    conn.execute(
        r#"INSERT INTO subscriptions 
           (account_id, payee_pattern, amount, frequency, last_charge_date, next_charge_date, is_active, category_id, confidence)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
        params![
            sub.account_id,
            sub.payee_pattern,
            sub.amount,
            sub.frequency,
            sub.last_charge_date,
            sub.next_charge_date,
            sub.is_active as i64,
            sub.category_id,
            sub.confidence,
        ],
    )?;
    
    let sub_id = conn.last_insert_rowid();
    
    // Link transactions to this subscription
    for tx_id in &sub.transaction_ids {
        conn.execute(
            "INSERT OR IGNORE INTO subscription_transactions (subscription_id, transaction_id) VALUES (?1, ?2)",
            params![sub_id, tx_id],
        )?;
    }
    
    Ok(sub_id)
}

/// Get all subscriptions for an account
pub fn get_by_account(conn: &Connection, account_id: i64) -> Result<Vec<Subscription>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        r#"SELECT id, account_id, payee_pattern, amount, frequency, 
           last_charge_date, next_charge_date, is_active, category_id, confidence
           FROM subscriptions WHERE account_id = ?1 AND is_active = 1
           ORDER BY next_charge_date ASC"#,
    )?;
    
    let subs: Vec<Subscription> = stmt.query_map(params![account_id], |row| {
        Ok(Subscription {
            id: Some(row.get(0)?),
            account_id: row.get(1)?,
            payee_pattern: row.get(2)?,
            amount: row.get(3)?,
            frequency: row.get(4)?,
            last_charge_date: row.get(5)?,
            next_charge_date: row.get(6)?,
            is_active: row.get::<_, i64>(7)? != 0,
            category_id: row.get(8)?,
            confidence: row.get(9)?,
            transaction_ids: vec![],
        })
    })?.collect::<Result<Vec<_>, _>>()?;
    
    // Load transaction IDs for each subscription
    let mut result = vec![];
    for mut sub in subs {
        let mut tx_stmt = conn.prepare(
            "SELECT transaction_id FROM subscription_transactions WHERE subscription_id = ?1"
        )?;
        let tx_ids: Vec<i64> = tx_stmt
            .query_map(params![sub.id], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;
        sub.transaction_ids = tx_ids;
        result.push(sub);
    }
    
    Ok(result)
}

/// Dismiss (deactivate) a subscription
pub fn dismiss(conn: &Connection, id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute(
        "UPDATE subscriptions SET is_active = 0 WHERE id = ?1",
        params![id],
    )
}

/// Delete a subscription and its links
pub fn delete(conn: &Connection, id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM subscriptions WHERE id = ?1", params![id])
}

/// Clear all subscriptions for an account (used before re-detection)
pub fn clear_for_account(conn: &Connection, account_id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute(
        "DELETE FROM subscriptions WHERE account_id = ?1",
        params![account_id],
    )
}
