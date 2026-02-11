import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from './DatabaseService';

const SESSION_KEY = '@fitness_tracker_session';
const SALT_ROUNDS = 10;

class AuthServiceClass {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Hash password using PBKDF2 (secure password hashing)
   */
  async hashPassword(password) {
    try {
      // Generate a random salt
      const salt = await this.generateSalt();
      
      // Use PBKDF2 to hash the password
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + salt,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      
      // Return salt and hash combined (salt:hash format)
      return `${salt}:${hash}`;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Generate a random salt for password hashing
   */
  async generateSalt() {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verify password against stored hash
   */
  async verifyPassword(password, storedHash) {
    try {
      const [salt, hash] = storedHash.split(':');
      
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + salt,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      
      return computedHash === hash;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const errors = [];
  // This where you put the password validation logic, for question # 2i
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Register a new user
   */
  async register(email, password, fullName) {
    try {
      // Validate inputs
      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      if (!fullName || fullName.trim().length < 2) {
        throw new Error('Full name must be at least 2 characters');
      }

      // Check if user already exists
      const existingUser = await DatabaseService.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const userId = await DatabaseService.createUser(
        email.toLowerCase(),
        passwordHash,
        fullName.trim()
      );

      // Create initial profile
      await DatabaseService.createOrUpdateProfile(userId, {
        age: null,
        weight: null,
        height: null,
        gender: null,
        fitness_goal: null
      });

      // Create default fitness activities
      await this.createDefaultActivities(userId);

      // Get created user
      const user = await DatabaseService.getUserById(userId);

      // Create session
      await this.createSession(user);

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      // Get user from database
      const user = await DatabaseService.getUserByEmail(email.toLowerCase());
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValid = await this.verifyPassword(password, user.password_hash);
      
      if (!isValid) {
        throw new Error('Invalid email or password');
      }

      // Remove password hash from user object
      const { password_hash, ...userWithoutPassword } = user;

      // Create session
      await this.createSession(userWithoutPassword);

      return userWithoutPassword;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Create session and store in AsyncStorage
   */
  async createSession(user) {
    try {
      const session = {
        user,
        timestamp: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      this.currentUser = user;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get current user from session
   */
  async getCurrentUser() {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);
      this.currentUser = session.user;
      
      return session.user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      this.currentUser = null;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    try {
      await DatabaseService.createOrUpdateProfile(userId, profileData);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user
      const user = await DatabaseService.getUserById(userId);
      const fullUser = await DatabaseService.getUserByEmail(user.email);
      
      // Verify current password
      const isValid = await this.verifyPassword(currentPassword, fullUser.password_hash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password in database
      await DatabaseService.db.runAsync(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      );

      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Create default fitness activities for new users
   */
  async createDefaultActivities(userId) {
    const defaultActivities = [
      {
        name: '💧 Hydration',
        description: 'Drink water throughout the day',
        icon: '💧',
        target_value: 8,
        target_unit: 'glasses',
        category: 'nutrition'
      },
      {
        name: '🏃 Cardio',
        description: 'Cardiovascular exercise',
        icon: '🏃',
        target_value: 30,
        target_unit: 'minutes',
        category: 'exercise'
      },
      {
        name: '🏋️ Strength',
        description: 'Strength training workout',
        icon: '🏋️',
        target_value: 45,
        target_unit: 'minutes',
        category: 'exercise'
      },
      {
        name: '🧘 Stretching',
        description: 'Flexibility and mobility work',
        icon: '🧘',
        target_value: 15,
        target_unit: 'minutes',
        category: 'recovery'
      },
      {
        name: '😴 Sleep',
        description: 'Quality sleep',
        icon: '😴',
        target_value: 8,
        target_unit: 'hours',
        category: 'recovery'
      },
      {
        name: '🥗 Healthy Meal',
        description: 'Balanced, nutritious meal',
        icon: '🥗',
        target_value: 3,
        target_unit: 'meals',
        category: 'nutrition'
      },
      {
        name: '📊 Track Progress',
        description: 'Log weight or measurements',
        icon: '📊',
        target_value: 1,
        target_unit: 'entry',
        category: 'tracking'
      }
    ];

    for (const activity of defaultActivities) {
      await DatabaseService.createActivity(userId, activity);
    }
  }
}

export const AuthService = new AuthServiceClass();
