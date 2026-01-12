use rusqlite::{params, Connection};
use super::models::Subscription;
use std::collections::{HashMap, HashSet};
use chrono::{NaiveDate, Duration};

/// Analyze transactions for an account and detect recurring payment patterns
/// Excludes patterns that are already saved as subscriptions
pub fn detect_subscriptions(conn: &Connection, account_id: i64) -> Result<Vec<Subscription>, rusqlite::Error> {
    // 0. Get existing subscription patterns to exclude
    let existing_patterns = get_existing_patterns(conn, account_id)?;
    
    // 1. Get all transactions for the account (expenses only, negative amounts)
    let mut stmt = conn.prepare(
        r#"SELECT id, payee, amount, date 
           FROM transactions 
           WHERE account_id = ?1 AND amount < 0
           ORDER BY date DESC"#,
    )?;
    
    let transactions: Vec<(i64, String, i64, String)> = stmt
        .query_map(params![account_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    
    if transactions.is_empty() {
        return Ok(vec![]);
    }
    
    // 2. Group transactions by normalized payee and amount
    let mut groups: HashMap<(String, i64), Vec<(i64, String)>> = HashMap::new();
    
    for (id, payee, amount, date) in transactions {
        let normalized = normalize_payee(&payee);
        let key = (normalized, amount);
        groups.entry(key).or_default().push((id, date));
    }
    
    // 3. Analyze each group for recurring patterns
    let mut detected: Vec<Subscription> = vec![];
    
    for ((payee_pattern, amount), mut occurrences) in groups {
        // Skip if already saved as a subscription
        if existing_patterns.contains(&(payee_pattern.clone(), amount)) {
            continue;
        }
        
        // Need at least 2 occurrences to detect a pattern
        if occurrences.len() < 2 {
            continue;
        }
        
        // Sort by date (ascending)
        occurrences.sort_by(|a, b| a.1.cmp(&b.1));
        
        // Calculate intervals between occurrences
        let intervals = calculate_intervals(&occurrences);
        
        if let Some((frequency, confidence)) = detect_frequency(&intervals) {
            if confidence >= 0.6 {
                let last_date = &occurrences.last().unwrap().1;
                let next_date = predict_next_date(last_date, &frequency);
                let tx_ids: Vec<i64> = occurrences.iter().map(|(id, _)| *id).collect();
                
                detected.push(Subscription {
                    id: None,
                    account_id,
                    payee_pattern,
                    amount,
                    frequency,
                    last_charge_date: Some(last_date.clone()),
                    next_charge_date: next_date,
                    is_active: true,
                    category_id: None,
                    confidence,
                    transaction_ids: tx_ids,
                });
            }
        }
    }
    
    // Sort by confidence (highest first)
    detected.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
    
    Ok(detected)
}

/// Get existing subscription patterns for deduplication
fn get_existing_patterns(conn: &Connection, account_id: i64) -> Result<HashSet<(String, i64)>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT payee_pattern, amount FROM subscriptions WHERE account_id = ?1"
    )?;
    
    let patterns: HashSet<(String, i64)> = stmt
        .query_map(params![account_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?
        .filter_map(|r| r.ok())
        .collect();
    
    Ok(patterns)
}

/// Normalize payee name for grouping
fn normalize_payee(payee: &str) -> String {
    let lower = payee.to_lowercase();
    // Remove common noise patterns (dates, transaction IDs, etc.)
    let cleaned: String = lower
        .chars()
        .filter(|c| c.is_alphabetic() || c.is_whitespace())
        .collect();
    cleaned.split_whitespace().take(3).collect::<Vec<_>>().join(" ")
}

/// Calculate day intervals between consecutive transactions
fn calculate_intervals(occurrences: &[(i64, String)]) -> Vec<i64> {
    let mut intervals = vec![];
    
    for i in 1..occurrences.len() {
        let prev_date = NaiveDate::parse_from_str(&occurrences[i - 1].1, "%Y-%m-%d");
        let curr_date = NaiveDate::parse_from_str(&occurrences[i].1, "%Y-%m-%d");
        
        if let (Ok(prev), Ok(curr)) = (prev_date, curr_date) {
            let days = (curr - prev).num_days();
            if days > 0 {
                intervals.push(days);
            }
        }
    }
    
    intervals
}

/// Detect frequency from intervals
fn detect_frequency(intervals: &[i64]) -> Option<(String, f64)> {
    if intervals.is_empty() {
        return None;
    }
    
    let avg: f64 = intervals.iter().sum::<i64>() as f64 / intervals.len() as f64;
    
    // Calculate standard deviation
    let variance: f64 = intervals.iter()
        .map(|&x| (x as f64 - avg).powi(2))
        .sum::<f64>() / intervals.len() as f64;
    let std_dev = variance.sqrt();
    
    // Determine frequency based on average interval
    let (frequency, expected_interval) = if (25.0..=35.0).contains(&avg) {
        ("monthly".to_string(), 30.0)
    } else if (355.0..=375.0).contains(&avg) {
        ("yearly".to_string(), 365.0)
    } else if (6.0..=8.0).contains(&avg) {
        ("weekly".to_string(), 7.0)
    } else if (12.0..=16.0).contains(&avg) {
        ("biweekly".to_string(), 14.0)
    } else {
        return None;
    };
    
    // Calculate confidence based on consistency
    // Lower std_dev = higher confidence
    let relative_std = std_dev / expected_interval;
    let confidence = (1.0 - relative_std).max(0.0).min(1.0);
    
    Some((frequency, confidence))
}

/// Predict the next charge date based on frequency
fn predict_next_date(last_date: &str, frequency: &str) -> Option<String> {
    let date = NaiveDate::parse_from_str(last_date, "%Y-%m-%d").ok()?;
    
    let next = match frequency {
        "weekly" => date + Duration::days(7),
        "biweekly" => date + Duration::days(14),
        "monthly" => date + Duration::days(30),
        "yearly" => date + Duration::days(365),
        _ => return None,
    };
    
    Some(next.format("%Y-%m-%d").to_string())
}
