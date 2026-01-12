mod db;

use db::models::{Account, Category, ImportResult, TransactionWithCategory};
use db::{accounts, categories, import, transactions, Database};
use tauri::{Manager, State};

// === Account Commands ===

#[tauri::command]
fn create_account(db: State<Database>, account: Account) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    accounts::create(&conn, &account).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_accounts(db: State<Database>) -> Result<Vec<Account>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    accounts::get_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_account(db: State<Database>, id: i64) -> Result<Option<Account>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    accounts::get_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_account(db: State<Database>, account: Account) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    accounts::update(&conn, &account).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_account(db: State<Database>, id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    accounts::delete(&conn, id).map_err(|e| e.to_string())
}

// === Category Commands ===

#[tauri::command]
fn create_category(db: State<Database>, category: Category) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    categories::create(&conn, &category).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_categories(db: State<Database>) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    categories::get_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_top_level_categories(db: State<Database>) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    categories::get_top_level(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_subcategories(db: State<Database>, parent_id: i64) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    categories::get_children(&conn, parent_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_category(db: State<Database>, id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    categories::delete(&conn, id).map_err(|e| e.to_string())
}

// === Transaction Commands ===

#[tauri::command]
fn get_transactions(
    db: State<Database>,
    account_id: i64,
    limit: Option<i64>,
) -> Result<Vec<TransactionWithCategory>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::get_by_account(&conn, account_id, limit).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_transactions_by_date_range(
    db: State<Database>,
    account_id: i64,
    start_date: String,
    end_date: String,
) -> Result<Vec<TransactionWithCategory>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::get_by_date_range(&conn, account_id, &start_date, &end_date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_spending_by_category(
    db: State<Database>,
    account_id: i64,
    start_date: String,
    end_date: String,
) -> Result<Vec<(String, i64)>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::get_spending_by_category(&conn, account_id, &start_date, &end_date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_transaction_category(
    db: State<Database>,
    transaction_id: i64,
    category_id: Option<i64>,
) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::update_category(&conn, transaction_id, category_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_transaction(db: State<Database>, id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::delete(&conn, id).map_err(|e| e.to_string())
}

// === Import Commands ===

#[tauri::command]
fn import_csv_file(
    db: State<Database>,
    csv_content: String,
    account_id: i64,
    filename: String,
) -> Result<ImportResult, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    import::import_csv(&conn, &csv_content, account_id, &filename)
}

// === App Entry Point ===

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db = Database::new(app.handle())
                .map_err(|e| format!("Failed to initialize database: {}", e))?;
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Accounts
            create_account,
            get_accounts,
            get_account,
            update_account,
            delete_account,
            // Categories
            create_category,
            get_categories,
            get_top_level_categories,
            get_subcategories,
            delete_category,
            // Transactions
            get_transactions,
            get_transactions_by_date_range,
            get_spending_by_category,
            update_transaction_category,
            delete_transaction,
            // Import
            import_csv_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
