use rusqlite::Connection;

pub fn initialize(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(SCHEMA)?;
    Ok(())
}

const SCHEMA: &str = r#"
-- Enable foreign key support (also done programmatically)
PRAGMA foreign_keys = ON;

-- 1. Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    account_number TEXT,
    currency TEXT DEFAULT 'DKK'
);

-- 2. Categories (Self-referencing for hierarchy)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 3. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    category_id INTEGER,
    date TEXT NOT NULL,
    payee TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_snapshot INTEGER,
    status TEXT,
    is_reconciled INTEGER DEFAULT 0,
    import_hash TEXT UNIQUE,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 4. Import History
CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    import_date TEXT DEFAULT (datetime('now')),
    records_added INTEGER
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- 5. Subscriptions (Detected recurring payments)
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    payee_pattern TEXT NOT NULL,
    amount INTEGER NOT NULL,
    frequency TEXT NOT NULL,              -- 'monthly', 'yearly', 'weekly'
    last_charge_date TEXT,
    next_charge_date TEXT,
    is_active INTEGER DEFAULT 1,
    category_id INTEGER,
    confidence REAL DEFAULT 0.0,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 6. Subscription-Transaction Links
CREATE TABLE IF NOT EXISTS subscription_transactions (
    subscription_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    PRIMARY KEY (subscription_id, transaction_id),
    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- 7. Budgets (groups of categories)
CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT
);

-- 8. Link categories to budgets (many-to-many)
CREATE TABLE IF NOT EXISTS budget_categories (
    budget_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (budget_id, category_id),
    FOREIGN KEY(budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 9. Monthly budget allocations
CREATE TABLE IF NOT EXISTS budget_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    allocated_amount INTEGER NOT NULL,
    UNIQUE(budget_id, month),
    FOREIGN KEY(budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- 10. Income streams (expected recurring income)
CREATE TABLE IF NOT EXISTS income_streams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    expected_amount INTEGER NOT NULL,
    frequency TEXT NOT NULL,
    category_id INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_month ON budget_allocations(month);
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget ON budget_categories(budget_id);
"#;
