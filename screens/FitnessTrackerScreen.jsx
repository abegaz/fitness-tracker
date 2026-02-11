import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

export default function FitnessTrackerScreen({ user, onLogout }) {
  const [activities, setActivities] = useState([]);
  const [todayLogs, setTodayLogs] = useState({});
  const [currentDate, setCurrentDate] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Activity form state
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityIcon, setActivityIcon] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [category, setCategory] = useState('exercise');

  useEffect(() => {
    loadData();
    updateDate();
  }, []);

  const updateDate = () => {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(now.toLocaleDateString('en-US', options));
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const loadData = async () => {
    try {
      // Load user's activities
      const userActivities = await DatabaseService.getActivitiesByUser(user.id);
      setActivities(userActivities);

      // Load today's logs
      const today = getTodayDate();
      const logs = await DatabaseService.getActivityLogsForDate(user.id, today);
      
      // Create a map of activity_id to log data
      const logsMap = {};
      logs.forEach(log => {
        logsMap[log.activity_id] = {
          completed: log.completed === 1,
          actual_value: log.actual_value,
          notes: log.notes
        };
      });
      setTodayLogs(logsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load activities');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const toggleActivity = async (activityId) => {
    try {
      const currentLog = todayLogs[activityId];
      const newCompleted = !currentLog?.completed;

      await DatabaseService.logActivity(
        user.id,
        activityId,
        getTodayDate(),
        newCompleted
      );

      setTodayLogs(prev => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          completed: newCompleted
        }
      }));
    } catch (error) {
      console.error('Error toggling activity:', error);
      Alert.alert('Error', 'Failed to update activity');
    }
  };

  const openAddActivity = () => {
    setEditingActivity(null);
    setActivityName('');
    setActivityDescription('');
    setActivityIcon('');
    setTargetValue('');
    setTargetUnit('');
    setCategory('exercise');
    setShowActivityModal(true);
  };

  const openEditActivity = (activity) => {
    setEditingActivity(activity);
    setActivityName(activity.name);
    setActivityDescription(activity.description || '');
    setActivityIcon(activity.icon || '');
    setTargetValue(activity.target_value?.toString() || '');
    setTargetUnit(activity.target_unit || '');
    setCategory(activity.category || 'exercise');
    setShowActivityModal(true);
  };

  const saveActivity = async () => {
    if (!activityName.trim()) {
      Alert.alert('Error', 'Please enter activity name');
      return;
    }

    try {
      const activityData = {
        name: activityName,
        description: activityDescription,
        icon: activityIcon,
        target_value: targetValue ? parseFloat(targetValue) : null,
        target_unit: targetUnit,
        category: category
      };

      if (editingActivity) {
        await DatabaseService.updateActivity(editingActivity.id, activityData);
      } else {
        await DatabaseService.createActivity(user.id, activityData);
      }

      setShowActivityModal(false);
      await loadData();
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity');
    }
  };

  const deleteActivity = async (activityId) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteActivity(activityId);
              await loadData();
            } catch (error) {
              console.error('Error deleting activity:', error);
              Alert.alert('Error', 'Failed to delete activity');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: onLogout }
      ]
    );
  };

  const completedCount = activities.filter(a => todayLogs[a.id]?.completed).length;
  const percentage = activities.length > 0 
    ? Math.round((completedCount / activities.length) * 100) 
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Fitness Tracker</Text>
            <Text style={styles.headerSubtitle}>Hi, {user.full_name}!</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerDate}>{currentDate}</Text>
        
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedCount} / {activities.length} completed ({percentage}%)
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={openAddActivity}>
            <Text style={styles.headerButtonText}>+ Add Activity</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity List */}
      <ScrollView
        style={styles.activityList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💪</Text>
            <Text style={styles.emptyStateText}>No activities yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first fitness activity to get started!
            </Text>
          </View>
        ) : (
          activities.map(activity => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              log={todayLogs[activity.id]}
              onToggle={() => toggleActivity(activity.id)}
              onEdit={() => openEditActivity(activity)}
              onDelete={() => deleteActivity(activity.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Activity Modal */}
      <Modal
        visible={showActivityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActivityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingActivity ? 'Edit Activity' : 'Add New Activity'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Activity name (e.g., Morning Run)"
              value={activityName}
              onChangeText={setActivityName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Icon (emoji, e.g., 🏃)"
              value={activityIcon}
              onChangeText={setActivityIcon}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={activityDescription}
              onChangeText={setActivityDescription}
              multiline
            />
            
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Target value"
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Unit (e.g., ml, km,min)"
                value={targetUnit}
                onChangeText={setTargetUnit}
              />
            </View>
            
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryLabel}>Category:</Text>
              <View style={styles.categoryButtons}>
                {['Wellness', 'Fitness', 'Health', 'Performance'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === cat && styles.categoryButtonTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowActivityModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveActivity}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Activity Item Component
function ActivityItem({ activity, log, onToggle, onEdit, onDelete }) {
  const isCompleted = log?.completed || false;
  
  return (
    <View style={[
      styles.activityItem,
      isCompleted && styles.activityItemCompleted
    ]}>
      <View style={styles.activityInfo}>
        <View style={styles.activityHeader}>
          {activity.icon && (
            <Text style={styles.activityIcon}>{activity.icon}</Text>
          )}
          <View style={styles.activityTitleContainer}>
            <Text style={[
              styles.activityName,
              isCompleted && styles.activityNameCompleted
            ]}>
              {activity.name}
            </Text>
            {activity.category && (
              <Text style={styles.categoryBadge}>{activity.category}</Text>
            )}
          </View>
        </View>
        
        {activity.description && (
          <Text style={styles.activityDescription}>
            {activity.description}
          </Text>
        )}
        
        {activity.target_value && (
          <Text style={styles.activityTarget}>
            Target: {activity.target_value} {activity.target_unit}
          </Text>
        )}
        
        {/* Action Buttons */}
        <View style={styles.activityActions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Text style={[styles.actionButtonText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Toggle Button */}
      <TouchableOpacity
        style={[
          styles.toggleButton,
          isCompleted && styles.toggleButtonActive
        ]}
        onPress={onToggle}
      >
        <View style={[
          styles.toggleCircle,
          isCompleted && styles.toggleCircleActive
        ]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffeb3b',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  activityList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  activityItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItemCompleted: {
    backgroundColor: '#E3F2FD',
  },
  activityInfo: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  activityTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  activityNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#90CAF9',
  },
  categoryBadge: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    textTransform: 'capitalize',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  activityTarget: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#90CAF9',
    fontWeight: '500',
  },
  deleteText: {
    color: '#f44336',
  },
  toggleButton: {
    width: 60,
    height: 30,
    backgroundColor: '#ccc',
    borderRadius: 15,
    justifyContent: 'center',
    padding: 3,
  },
  toggleButtonActive: {
    backgroundColor: '#90CAF9',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: '#90CAF9',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#90CAF9',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
