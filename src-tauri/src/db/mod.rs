pub mod schema;
pub mod models;
pub mod accounts;
pub mod categories;
pub mod transactions;
pub mod import;
pub mod subscriptions;
pub mod subscription_engine;

use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct Database {
    pub conn: Mutex<Connection>,
    pub path: PathBuf,
}

impl Database {
    pub fn new(app_handle: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");
        
        std::fs::create_dir_all(&app_dir)?;
        let db_path = app_dir.join("goblin.db");
        
        let conn = Connection::open(&db_path)?;
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        schema::initialize(&conn)?;
        
        Ok(Self {
            conn: Mutex::new(conn),
            path: db_path,
        })
    }
}
