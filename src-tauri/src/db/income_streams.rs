use rusqlite::{params, Connection, OptionalExtension};
use super::models::IncomeStream;

pub fn create(conn: &Connection, stream: &IncomeStream) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO income_streams (name, expected_amount, frequency, category_id, is_active) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![stream.name, stream.expected_amount, stream.frequency, stream.category_id, stream.is_active as i32],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_all(conn: &Connection) -> Result<Vec<IncomeStream>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT id, name, expected_amount, frequency, category_id, is_active FROM income_streams ORDER BY name")?;
    let rows = stmt.query_map([], |row| {
        Ok(IncomeStream {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            expected_amount: row.get(2)?,
            frequency: row.get(3)?,
            category_id: row.get(4)?,
            is_active: row.get::<_, i32>(5)? != 0,
        })
    })?;
    rows.collect()
}

pub fn update(conn: &Connection, stream: &IncomeStream) -> Result<usize, rusqlite::Error> {
    conn.execute(
        "UPDATE income_streams SET name = ?1, expected_amount = ?2, frequency = ?3, category_id = ?4, is_active = ?5 WHERE id = ?6",
        params![stream.name, stream.expected_amount, stream.frequency, stream.category_id, stream.is_active as i32, stream.id],
    )
}

pub fn delete(conn: &Connection, id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM income_streams WHERE id = ?1", params![id])
}
