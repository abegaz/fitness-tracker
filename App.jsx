import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AuthScreen from './screens/AuthScreen';
import FitnessTrackerScreen from './screens/FitnessTrackerScreen';
import { DatabaseService } from './services/DatabaseService';
import { AuthService } from './services/AuthService';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await DatabaseService.init();
      
      // Check if user is already logged in
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#536DFE" />
      </View>
    );
  }

  return currentUser ? (
    <FitnessTrackerScreen user={currentUser} onLogout={handleLogout} />
  ) : (
    <AuthScreen onLogin={handleLogin} />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
