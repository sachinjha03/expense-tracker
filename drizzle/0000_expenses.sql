CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  paise INTEGER NOT NULL CHECK (paise BETWEEN 1 AND 99999999999),
  payer TEXT NOT NULL CHECK (payer IN ('Sachin', 'Vikas', 'Manisha', 'Basuki')),
  description TEXT NOT NULL CHECK (length(description) <= 500),
  added_at TEXT NOT NULL
);
