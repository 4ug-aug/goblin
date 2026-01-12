use rusqlite::{params, Connection, OptionalExtension};
use super::models::Account;

pub fn create(conn: &Connection, account: &Account) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO accounts (name, account_number, currency) VALUES (?1, ?2, ?3)",
        params![account.name, account.account_number, account.currency],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Account>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT id, name, account_number, currency FROM accounts ORDER BY name")?;
    let rows = stmt.query_map([], |row| {
        Ok(Account {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            account_number: row.get(2)?,
            currency: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Option<Account>, rusqlite::Error> {
    conn.query_row(
        "SELECT id, name, account_number, currency FROM accounts WHERE id = ?1",
        params![id],
        |row| {
            Ok(Account {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                account_number: row.get(2)?,
                currency: row.get(3)?,
            })
        },
    )
    .optional()
}

pub fn update(conn: &Connection, account: &Account) -> Result<usize, rusqlite::Error> {
    let id = account.id.ok_or(rusqlite::Error::InvalidParameterName(
        "Account ID is required for update".to_string(),
    ))?;
    conn.execute(
        "UPDATE accounts SET name = ?1, account_number = ?2, currency = ?3 WHERE id = ?4",
        params![account.name, account.account_number, account.currency, id],
    )
}

pub fn delete(conn: &Connection, id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM accounts WHERE id = ?1", params![id])
}
