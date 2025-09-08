import * as Haptics from 'expo-haptics';

class NotificationService {
  constructor(enableHaptics = true) {
    this.enableHaptics = enableHaptics;
  }

  showTemporaryNotification(message, type = 'info') {
    // This would typically integrate with a notification system component
    console.log(`Notification (${type}): ${message}`);
    
    if (this.enableHaptics) {
      this.playHapticFeedback(type);
    }
  }

  playHapticFeedback(type) {
    if (!this.enableHaptics) return;

    try {
      switch (type) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'info':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('Error playing haptic feedback:', error);
    }
  }

  alert(title, message, buttons = [{ text: 'OK' }]) {
    // This would integrate with the native alert system
    console.log(`Alert: ${title} - ${message}`);
  }
}

export default NotificationService;