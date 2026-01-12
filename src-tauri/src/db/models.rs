use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: Option<i64>,
    pub name: String,
    pub account_number: Option<String>,
    pub currency: String,
}

impl Default for Account {
    fn default() -> Self {
        Self {
            id: None,
            name: String::new(),
            account_number: None,
            currency: "DKK".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: Option<i64>,
    pub name: String,
    pub parent_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: Option<i64>,
    pub account_id: i64,
    pub category_id: Option<i64>,
    pub date: String,              // ISO8601: YYYY-MM-DD
    pub payee: String,
    pub amount: i64,               // In øre (cents)
    pub balance_snapshot: Option<i64>,
    pub status: Option<String>,
    pub is_reconciled: bool,
    pub import_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportLog {
    pub id: Option<i64>,
    pub filename: String,
    pub import_date: Option<String>,
    pub records_added: i64,
}

/// Transaction with expanded category information for frontend display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionWithCategory {
    #[serde(flatten)]
    pub transaction: Transaction,
    pub category_name: Option<String>,
    pub parent_category_name: Option<String>,
}

/// Result of a CSV import operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub total_rows: usize,
    pub imported: usize,
    pub skipped_duplicates: usize,
}
