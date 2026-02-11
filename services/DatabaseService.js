import * as SQLite from 'expo-sqlite';

class DatabaseServiceClass {
  constructor() {
    this.db = null;
  }

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('fitness_tracker.db');
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  async createTables() {
    // Users table with hashed passwords
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User profiles for additional fitness data
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        age INTEGER,
        weight REAL,
        height REAL,
        gender TEXT,
        fitness_goal TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Fitness activities/habits
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS fitness_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        target_value REAL,
        target_unit TEXT,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Daily activity logs
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        actual_value REAL,
        notes TEXT,
        log_date DATE NOT NULL,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (activity_id) REFERENCES fitness_activities (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(activity_id, log_date)
      );
    `);

    // Workout sessions
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        workout_type TEXT NOT NULL,
        duration_minutes INTEGER,
        calories_burned REAL,
        intensity TEXT,
        notes TEXT,
        session_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Body measurements tracking
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weight REAL,
        body_fat_percentage REAL,
        muscle_mass REAL,
        waist_circumference REAL,
        measurement_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create indices for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(log_date);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_fitness_activities_user ON fitness_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON body_measurements(user_id);
    `);
  }

  // User operations
  async createUser(email, passwordHash, fullName) {
    const result = await this.db.runAsync(
      'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
      [email, passwordHash, fullName]
    );
    return result.lastInsertRowId;
  }

  async getUserByEmail(email) {
    const result = await this.db.getFirstAsync(
      'SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = ?',
      [email]
    );
    return result;
  }

  async getUserById(userId) {
    const result = await this.db.getFirstAsync(
      'SELECT id, email, full_name, created_at FROM users WHERE id = ?',
      [userId]
    );
    return result;
  }

  // User profile operations
  async createOrUpdateProfile(userId, profileData) {
    const { age, weight, height, gender, fitness_goal } = profileData;
    
    const existing = await this.db.getFirstAsync(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing) {
      await this.db.runAsync(
        `UPDATE user_profiles 
         SET age = ?, weight = ?, height = ?, gender = ?, fitness_goal = ?
         WHERE user_id = ?`,
        [age, weight, height, gender, fitness_goal, userId]
      );
    } else {
      await this.db.runAsync(
        `INSERT INTO user_profiles (user_id, age, weight, height, gender, fitness_goal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, age, weight, height, gender, fitness_goal]
      );
    }
  }

  async getUserProfile(userId) {
    const result = await this.db.getFirstAsync(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    return result;
  }

  // Fitness activities operations
  async createActivity(userId, activityData) {
    const { name, description, icon, target_value, target_unit, category } = activityData;
    const result = await this.db.runAsync(
      `INSERT INTO fitness_activities 
       (user_id, name, description, icon, target_value, target_unit, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description, icon, target_value, target_unit, category]
    );
    return result.lastInsertRowId;
  }

  async getActivitiesByUser(userId) {
    const results = await this.db.getAllAsync(
      `SELECT * FROM fitness_activities 
       WHERE user_id = ? AND is_active = 1 
       ORDER BY created_at DESC`,
      [userId]
    );
    return results;
  }

  async updateActivity(activityId, activityData) {
    const { name, description, icon, target_value, target_unit, category } = activityData;
    await this.db.runAsync(
      `UPDATE fitness_activities 
       SET name = ?, description = ?, icon = ?, target_value = ?, target_unit = ?, category = ?
       WHERE id = ?`,
      [name, description, icon, target_value, target_unit, category, activityId]
    );
  }

  async deleteActivity(activityId) {
    await this.db.runAsync(
      'UPDATE fitness_activities SET is_active = 0 WHERE id = ?',
      []
    );
  }

 

  // Activity logs operations
  async logActivity(userId, activityId, date, completed, actualValue = null, notes = null) {
    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO activity_logs 
         (activity_id, user_id, completed, actual_value, notes, log_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [activityId, userId, completed ? 1 : 0, actualValue, notes, date]
      );
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  async getActivityLogsForDate(userId, date) {
    const results = await this.db.getAllAsync(
      `SELECT al.*, fa.name, fa.description, fa.icon, fa.target_value, fa.target_unit, fa.category
       FROM activity_logs al
       JOIN fitness_activities fa ON al.activity_id = fa.id
       WHERE al.user_id = ? AND al.log_date = ?`,
      [userId, date]
    );
    return results;
  }

  async getActivityStats(userId, startDate, endDate) {
    const results = await this.db.getAllAsync(
      `SELECT 
         fa.id,
         fa.name,
         fa.category,
         COUNT(CASE WHEN al.completed = 1 THEN 1 END) as completed_count,
         COUNT(*) as total_count,
         AVG(CASE WHEN al.completed = 1 THEN 1.0 ELSE 0.0 END) * 100 as completion_rate
       FROM fitness_activities fa
       LEFT JOIN activity_logs al ON fa.id = al.activity_id 
         AND al.log_date BETWEEN ? AND ?
       WHERE fa.user_id = ? AND fa.is_active = 1
       GROUP BY fa.id`,
      [startDate, endDate, userId]
    );
    return results;
  }

  // Workout sessions operations
  async createWorkoutSession(userId, sessionData) {
    const { workout_type, duration_minutes, calories_burned, intensity, notes, session_date } = sessionData;
    const result = await this.db.runAsync(
      `INSERT INTO workout_sessions 
       (user_id, workout_type, duration_minutes, calories_burned, intensity, notes, session_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, workout_type, duration_minutes, calories_burned, intensity, notes, session_date]
    );
    return result.lastInsertRowId;
  }

  async getWorkoutSessions(userId, startDate, endDate) {
    const results = await this.db.getAllAsync(
      `SELECT * FROM workout_sessions 
       WHERE user_id = ? AND session_date BETWEEN ? AND ?
       ORDER BY session_date DESC`,
      [userId, startDate, endDate]
    );
    return results;
  }

  // Body measurements operations
  async addBodyMeasurement(userId, measurementData) {
    const { weight, body_fat_percentage, muscle_mass, waist_circumference, measurement_date } = measurementData;
    const result = await this.db.runAsync(
      `INSERT INTO body_measurements 
       (user_id, weight, body_fat_percentage, muscle_mass, waist_circumference, measurement_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, weight, body_fat_percentage, muscle_mass, waist_circumference, measurement_date]
    );
    return result.lastInsertRowId;
  }

  async getBodyMeasurements(userId, limit = 30) {
    const results = await this.db.getAllAsync(
      `SELECT * FROM body_measurements 
       WHERE user_id = ? 
       ORDER BY measurement_date DESC 
       LIMIT ?`,
      [userId, limit]
    );
    return results;
  }

  // Utility methods
  async clearUserData(userId) {
    await this.db.execAsync(`
      DELETE FROM activity_logs WHERE user_id = ${userId};
      DELETE FROM fitness_activities WHERE user_id = ${userId};
      DELETE FROM workout_sessions WHERE user_id = ${userId};
      DELETE FROM body_measurements WHERE user_id = ${userId};
      DELETE FROM user_profiles WHERE user_id = ${userId};

    `);
  }
}

export const DatabaseService = new DatabaseServiceClass();
