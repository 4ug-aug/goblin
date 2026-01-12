use rusqlite::{params, Connection, OptionalExtension};
use super::models::Category;

pub fn create(conn: &Connection, category: &Category) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO categories (name, parent_id) VALUES (?1, ?2)",
        params![category.name, category.parent_id],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Category>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, parent_id FROM categories ORDER BY parent_id NULLS FIRST, name",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            parent_id: row.get(2)?,
        })
    })?;
    rows.collect()
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Option<Category>, rusqlite::Error> {
    conn.query_row(
        "SELECT id, name, parent_id FROM categories WHERE id = ?1",
        params![id],
        |row| {
            Ok(Category {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                parent_id: row.get(2)?,
            })
        },
    )
    .optional()
}

/// Find or create a category, returning its ID.
/// This is the key function for CSV import - it ensures categories are not duplicated.
pub fn find_or_create(
    conn: &Connection,
    name: &str,
    parent_id: Option<i64>,
) -> Result<i64, rusqlite::Error> {
    // Try to find existing category with same name and parent
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM categories WHERE name = ?1 AND parent_id IS ?2",
            params![name, parent_id],
            |row| row.get(0),
        )
        .optional()?;

    if let Some(id) = existing {
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO categories (name, parent_id) VALUES (?1, ?2)",
            params![name, parent_id],
        )?;
        Ok(conn.last_insert_rowid())
    }
}

/// Get all top-level categories (those without a parent)
pub fn get_top_level(conn: &Connection) -> Result<Vec<Category>, rusqlite::Error> {
    let mut stmt =
        conn.prepare("SELECT id, name, parent_id FROM categories WHERE parent_id IS NULL ORDER BY name")?;
    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            parent_id: None,
        })
    })?;
    rows.collect()
}

/// Get subcategories for a given parent category
pub fn get_children(conn: &Connection, parent_id: i64) -> Result<Vec<Category>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, parent_id FROM categories WHERE parent_id = ?1 ORDER BY name",
    )?;
    let rows = stmt.query_map(params![parent_id], |row| {
        Ok(Category {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            parent_id: Some(row.get(2)?),
        })
    })?;
    rows.collect()
}

pub fn delete(conn: &Connection, id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
}
