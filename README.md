# Exam 1: Fitness Tracker App with Secure User Authentication

A comprehensive React Native fitness tracking application built with Expo, featuring secure user authentication, encrypted password storage, and SQLite database for persistent data management.

## Features

### 🔐 Security Features

- **Secure Password Hashing**: Uses PBKDF2 with SHA-256 for password encryption
- **Unique Salt per User**: Each password has a unique cryptographic salt
- **Session Management**: Secure session storage using AsyncStorage
- **Password Requirements**: Enforces strong password policies
- **User Data Isolation**: Each user's data is completely isolated in the database

**Why this is secure**:

- Rainbow table attacks are ineffective (unique salts)
- Brute force attacks are computationally expensive
- Original password cannot be recovered from hash

### 💪 Fitness Tracking Features

- **Custom Activities**: Create personalized fitness activities with targets
- **Daily Logging**: Track completion of activities daily
- **Progress Tracking**: Visual progress indicators and statistics
- **Categories**: Organize activities by exercise, nutrition, recovery, or tracking
- **Auto-Reset**: Activities reset daily for fresh tracking
- **Default Activities**: Pre-populated with common fitness activities

### Database Schema

- **Users**: Secure user credentials and profile information
- **User Profiles**: Extended fitness data (age, weight, height, goals)
- **Fitness Activities**: User-specific activities with targets
- **Activity Logs**: Daily completion tracking with timestamps
- **Workout Sessions**: Detailed workout tracking
- **Body Measurements**: Progress measurements over time

## Installation

### Setup

1. **Clone or download the the project from the following link**

## Project Structure

```
fitness-tracker-app/
├── App.js                          # Main app entry point
├── package.json                    # Dependencies
├── src/
│   ├── screens/
│   │   ├── AuthScreen.js          # Login/Registration screen
│   │   └── FitnessTrackerScreen.js # Main fitness tracking interface
│   └── services/
│       ├── AuthService.js         # Authentication & password security
│       └── DatabaseService.js     # SQLite database operations
```

## Security Implementation

### Password Hashing

```javascript
// Passwords are hashed using PBKDF2 with SHA-256
const hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  password + salt
);
// Stored as: "salt:hash"
```

### Session Management

- Sessions stored in AsyncStorage
- No sensitive credentials stored in plain text
- Automatic session restoration on app restart

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Fitness Activities Table

```sql
CREATE TABLE fitness_activities (
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
```

### Activity Logs Table

```sql
CREATE TABLE activity_logs (
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
```

## Usage

### Creating an Account

1. Open the app
2. Tap "Sign Up"
3. Enter your full name, email, and password
4. Password must meet security requirements
5. Tap "Create Account"

### Logging In

1. Enter your email and password
2. Tap "Login"
3. Your activities will load automatically

### Managing Activities

- **Add Activity**: Tap "+ Add Activity" button
- **Edit Activity**: Tap "Edit" on any activity card
- **Delete Activity**: Tap "Delete" on any activity card
- **Complete Activity**: Toggle the switch on the right

### Activity Categories

- **Exercise**: Cardio, strength training, sports
- **Nutrition**: Meal tracking, hydration
- **Recovery**: Sleep, stretching, meditation
- **Tracking**: Weight, measurements, progress photos

## Advanced Features (Available in Database)

While not all features are exposed in the current UI, the database supports:

- **User Profiles**: Age, weight, height, fitness goals
- **Workout Sessions**: Detailed workout tracking with duration and calories
- **Body Measurements**: Track weight, body fat, muscle mass over time
- **Activity Statistics**: Completion rates and trends

## Development

### Adding New Features

1. **Extend Database Schema**: Modify `DatabaseService.js`
2. **Add Service Methods**: Add methods to query/update new tables
3. **Update UI**: Create or modify screens to expose new features

### Testing

Test with multiple users to verify data isolation:

```javascript
// Each user sees only their own data
const activities = await DatabaseService.getActivitiesByUser(userId);
```

## Security Best Practices

✅ **Implemented:**

- Password hashing with salt
- SQL injection prevention (parameterized queries)
- User data isolation
-
- Secure session management

## Need to work:

You need to meet the followin strong password requirements

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

## Troubleshooting

### Database Issues

```javascript
// Reset database (use with caution!)
await DatabaseService.db.execAsync("DROP TABLE IF EXISTS users");
await DatabaseService.createTables();
```
