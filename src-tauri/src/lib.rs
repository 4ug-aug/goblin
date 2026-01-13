mod db;

use db::models::{Account, Category, ImportResult, TransactionWithCategory, Subscription, Budget, BudgetAllocation, BudgetWithSpending, IncomeStream};
use db::{accounts, categories, import, transactions, subscriptions, subscription_engine, budgets, income_streams, Database};
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
fn update_batch_categories(
    db: State<Database>,
    transaction_ids: Vec<i64>,
    category_id: Option<i64>,
) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::update_batch_categories(&conn, transaction_ids, category_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_transaction(db: State<Database>, id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::delete(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_transactions_by_account(db: State<Database>, account_id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    transactions::delete_by_account(&conn, account_id).map_err(|e| e.to_string())
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

/// Import CSV from raw bytes - handles encoding detection automatically
#[tauri::command]
fn import_csv_bytes(
    db: State<Database>,
    bytes: Vec<u8>,
    account_id: i64,
    filename: String,
) -> Result<ImportResult, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    import::import_csv_bytes(&conn, &bytes, account_id, &filename)
}

// === Subscription Commands ===

#[tauri::command]
fn detect_subscriptions(db: State<Database>, account_id: i64) -> Result<Vec<Subscription>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    subscription_engine::detect_subscriptions(&conn, account_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_subscriptions(db: State<Database>, account_id: i64) -> Result<Vec<Subscription>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    subscriptions::get_by_account(&conn, account_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_subscription(db: State<Database>, subscription: Subscription) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    subscriptions::create(&conn, &subscription).map_err(|e| e.to_string())
}

#[tauri::command]
fn dismiss_subscription(db: State<Database>, id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    subscriptions::dismiss(&conn, id).map_err(|e| e.to_string())
}

// === Budget Commands ===

#[tauri::command]
fn create_budget(db: State<Database>, budget: Budget) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::create(&conn, &budget).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_budgets(db: State<Database>) -> Result<Vec<Budget>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::get_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_budget(db: State<Database>, budget: Budget) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::update(&conn, &budget).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_budget(db: State<Database>, id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::delete(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_budget_categories(db: State<Database>, budget_id: i64, category_ids: Vec<i64>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::remove_all_categories(&conn, budget_id).map_err(|e| e.to_string())?;
    for cat_id in category_ids {
        budgets::add_category(&conn, budget_id, cat_id).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_budget_categories(db: State<Database>, budget_id: i64) -> Result<Vec<i64>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::get_categories(&conn, budget_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_budget_allocation(db: State<Database>, budget_id: i64, month: String, amount: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::set_allocation(&conn, budget_id, &month, amount).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_budgets_with_spending(db: State<Database>, month: String) -> Result<Vec<BudgetWithSpending>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    budgets::get_budgets_with_spending(&conn, &month).map_err(|e| e.to_string())
}

// === Income Stream Commands ===

#[tauri::command]
fn create_income_stream(db: State<Database>, stream: IncomeStream) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    income_streams::create(&conn, &stream).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_income_streams(db: State<Database>) -> Result<Vec<IncomeStream>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    income_streams::get_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_income_stream(db: State<Database>, stream: IncomeStream) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    income_streams::update(&conn, &stream).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_income_stream(db: State<Database>, id: i64) -> Result<usize, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    income_streams::delete(&conn, id).map_err(|e| e.to_string())
}

// === App Entry Point ===

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            update_batch_categories,
            delete_transaction,
            delete_transactions_by_account,
            // Import
            import_csv_file,
            import_csv_bytes,
            // Subscriptions
            detect_subscriptions,
            get_subscriptions,
            save_subscription,
            dismiss_subscription,
            // Budgets
            create_budget,
            get_budgets,
            update_budget,
            delete_budget,
            set_budget_categories,
            get_budget_categories,
            set_budget_allocation,
            get_budgets_with_spending,
            // Income Streams
            create_income_stream,
            get_income_streams,
            update_income_stream,
            delete_income_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
