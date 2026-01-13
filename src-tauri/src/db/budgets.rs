use rusqlite::{params, Connection, OptionalExtension};
use super::models::{Budget, BudgetAllocation, BudgetWithSpending};

pub fn create(conn: &Connection, budget: &Budget) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO budgets (name, color, icon) VALUES (?1, ?2, ?3)",
        params![budget.name, budget.color, budget.icon],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Budget>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT id, name, color, icon FROM budgets ORDER BY name")?;
    let rows = stmt.query_map([], |row| {
        Ok(Budget {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn update(conn: &Connection, budget: &Budget) -> Result<usize, rusqlite::Error> {
    conn.execute(
        "UPDATE budgets SET name = ?1, color = ?2, icon = ?3 WHERE id = ?4",
        params![budget.name, budget.color, budget.icon, budget.id],
    )
}

pub fn delete(conn: &Connection, id: i64) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM budgets WHERE id = ?1", params![id])
}

// === Budget Category Links ===

pub fn add_category(conn: &Connection, budget_id: i64, category_id: i64) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR IGNORE INTO budget_categories (budget_id, category_id) VALUES (?1, ?2)",
        params![budget_id, category_id],
    )?;
    Ok(())
}

pub fn remove_all_categories(conn: &Connection, budget_id: i64) -> Result<(), rusqlite::Error> {
    conn.execute(
        "DELETE FROM budget_categories WHERE budget_id = ?1",
        params![budget_id],
    )?;
    Ok(())
}

pub fn get_categories(conn: &Connection, budget_id: i64) -> Result<Vec<i64>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT category_id FROM budget_categories WHERE budget_id = ?1")?;
    let rows = stmt.query_map(params![budget_id], |row| row.get(0))?;
    rows.collect()
}

// === Budget Allocations ===

pub fn set_allocation(conn: &Connection, budget_id: i64, month: &str, amount: i64) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO budget_allocations (budget_id, month, allocated_amount) 
         VALUES (?1, ?2, ?3)
         ON CONFLICT(budget_id, month) DO UPDATE SET allocated_amount = excluded.allocated_amount",
        params![budget_id, month, amount],
    )?;
    Ok(())
}

// === Budget with Spending ===

pub fn get_budgets_with_spending(conn: &Connection, month: &str) -> Result<Vec<BudgetWithSpending>, rusqlite::Error> {
    let budgets = get_all(conn)?;
    let mut result = Vec::new();

    for budget in budgets {
        let budget_id = budget.id.unwrap();
        
        // Get linked categories
        let category_ids = get_categories(conn, budget_id)?;
        
        // Get allocation for this month
        let allocated_amount: i64 = conn.query_row(
            "SELECT allocated_amount FROM budget_allocations WHERE budget_id = ?1 AND month = ?2",
            params![budget_id, month],
            |row| row.get(0)
        ).unwrap_or(0);

        // Calculate spending
        // We include spending from the category AND any subcategories
        let mut spent_amount = 0;
        if !category_ids.is_empty() {
            // Build a set of all category IDs (including children)
            let mut all_affected_ids = category_ids.clone();
            
            // For simplicity in a small app, we'll just check one level of children
            // If they want deeper, a recursive CTE would be better
            for cat_id in &category_ids {
                let mut stmt = conn.prepare("SELECT id FROM categories WHERE parent_id = ?1")?;
                let children = stmt.query_map(params![cat_id], |row| row.get::<_, i64>(0))?;
                for child in children {
                    all_affected_ids.push(child?);
                }
            }

            // Query transactions for these categories in the given month
            // month is YYYY-MM, transactions date is YYYY-MM-DD
            let query = format!(
                "SELECT SUM(ABS(amount)) FROM transactions 
                 WHERE category_id IN ({}) AND date LIKE '{}%' AND amount < 0",
                all_affected_ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(","),
                month
            );
            
            spent_amount = conn.query_row(&query, [], |row| row.get::<_, Option<i64>>(0))?.unwrap_or(0);
        }

        result.push(BudgetWithSpending {
            budget,
            category_ids,
            allocated_amount,
            spent_amount,
        });
    }

    Ok(result)
}
