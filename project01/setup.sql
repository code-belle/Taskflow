-- ================================================
-- TaskFlow Database Setup
-- Run this in phpMyAdmin or MySQL command line
-- ================================================

CREATE DATABASE IF NOT EXISTS taskflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE taskflow;

CREATE TABLE IF NOT EXISTS tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  priority    ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  due_date    DATE          DEFAULT NULL,
  status      ENUM('Pending','Completed') NOT NULL DEFAULT 'Pending',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample data
INSERT INTO tasks (title, priority, due_date, status) VALUES
  ('Complete assignment',  'High',   '2026-10-10', 'Pending'),
  ('Study Mathematics',    'Medium', '2026-10-11', 'Pending'),
  ('Submit project',       'High',   '2026-10-12', 'Completed'),
  ('Buy textbooks',        'Low',    '2026-10-15', 'Pending');
