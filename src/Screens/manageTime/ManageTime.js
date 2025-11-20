import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStorage } from '../../Hooks/useAppStorage';

// get today key
const getTodayKey = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const ManageTime = () => {
  const { getApps, updateApp } = useAppStorage(); // add updateApp in hook
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalResetVisible, setModalResetVisible] = useState(false);
  // const [resetApp, setResetApp] = useState(null);
  const todayKey = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  }); // YYYY-MM-DD

  const defaultTimeLimit = 20 * 60; // default time limit in seconds (30 minutes)

  // fetch apps from storage

  useFocusEffect(
    useCallback(() => {
      const fetchApps = async () => {
        try {
          const appsFromStorage = await getApps();
          // Transform the object into an array
          const usageArray = Object.entries(appsFromStorage).map(
            ([pkg, data]) => ({
              packageName: pkg,
              ...data,
            }),
          );
          console.log('Manage time components:', usageArray);
          setApps(usageArray);
        } catch (error) {
          console.error('Error fetching apps:', error);
        }
      };
      fetchApps();
    }, []),
  );

  // reset alert handler
  const resetHanlder = app => {
    setModalResetVisible(true);
    setSelectedApp(app);
  };

  // app timing reset handler
  const resetAppDataHandler = async isReady => {
    try {
      if (isReady) {
        // get today's key
        const todayKey = getTodayKey();
        const { usageHistory } = selectedApp;
        // if usageHistory is undefined
        if (!usageHistory) return;
        // extract used time for today
        const usedTime = usageHistory ? usageHistory[todayKey] || 0 : 0;
        console.log('Used time for today: ', usedTime);
        // if used time is greater than default time limit then show alert and return
        if (usedTime >= defaultTimeLimit) {
          // Format used time for alert
          let usedTimeStr = '';
          if (usedTime < 3600) {
            // less than 1 hour, show in minutes
            const minutes = Math.floor(usedTime / 60);
            usedTimeStr = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
          } else {
            // 1 hour or more, show in hours and minutes
            const hours = Math.floor(usedTime / 3600);
            const minutes = Math.floor((usedTime % 3600) / 60);
            usedTimeStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
            if (minutes > 0) {
              usedTimeStr += ` ${minutes} minute${minutes !== 1 ? 's' : ''}`;
            }
          }
          const defaultLimitMin = Math.floor(defaultTimeLimit / 60);
          alert(
            `You have already used ${usedTimeStr} today. You can not reset to default time limit of ${defaultLimitMin} minutes.`,
          );
          setModalResetVisible(false);
          setSelectedApp(null);
          return;
        }
        // reset today's usage to 0 and time limit to default 30 minutes
        const updatedApp = {
          ...selectedApp,
          timeLimitInMinutes: 30, // reset to default 30 minutes
        };

        await updateApp(updatedApp.packageName, updatedApp); // save updated data to storage
        // update state to reflect changes in UI
        updateAppState(updatedApp);
      }
      setModalResetVisible(false);
      console.log('resetAppDataHandler isReady: ', isReady);
    } catch (error) {
      console.error('Error in resetAppDataHandler:', error);
    }
  };

  // handle increase time limit by 10 minutes
  const handleIncrease = async app => {
    const increment = 10; // minutes to increase
    const { timeLimitInMinutes } = app;

    // New time limit after increment
    const newTimeLimit = timeLimitInMinutes + increment;
    // Update app object
    const updatedApp = {
      ...app,
      timeLimitInMinutes: newTimeLimit,
    };
    // Update storage
    await updateApp(app.packageName, updatedApp);
    // fetchApps(); // Refresh the app list
    updateAppState(updatedApp);
  };

  // handle decrease time limit by 10 minutes
  const handleDecrease = async app => {
    const todayKey = getTodayKey();
    const { timeLimitInMinutes, usageHistory } = app;
    const usedTime = usageHistory ? usageHistory[todayKey] || 0 : 0;
    const oldTimeLimit = timeLimitInMinutes * 60; // convert to seconds
    const decrement = 10; // minutes to decrease
    // user can not decrease time limit less than used time limit and default time limit
    if (
      usedTime >= oldTimeLimit - decrement ||
      defaultTimeLimit >= oldTimeLimit - decrement
    ) {
      alert(
        `You can not set time limit less than default time limit. Used time is ${(
          usedTime / 60
        ).toFixed(2)} min and default time limit is ${(
          defaultTimeLimit / 60
        ).toFixed(2)} min`,
      );
      return;
    }
    // New time limit after decrement
    const newTimeLimit = timeLimitInMinutes - decrement;
    // Update app object
    const updatedApp = {
      ...app,
      timeLimitInMinutes: newTimeLimit,
    };
    // Update storage
    await updateApp(app.packageName, updatedApp);
    // fetchApps(); // Refresh the app list
    updateAppState(updatedApp);
  };

  // update state to reflect changes in UI
  const updateAppState = updatedApp => {
    const updatedApps = apps.map(app =>
      app.packageName === updatedApp.packageName ? updatedApp : app,
    );
    setApps(updatedApps);
    setSelectedApp(null);
  };

  // 2.1. user can not decrease time limit less than used time and default time
  // (usedTime >= oldtimeLimit - 10) or (defaultTime >= oldtimeLimit - 10) show alert (else) decrease time limit

  // time exicution handler to show time limit in minutes and hours
  const formatTime = app => {
    const { timeLimitInMinutes } = app;
    const minutes = timeLimitInMinutes;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs} hr ${mins} min`;
  };

  // used time handler to show used time in minutes and hours
  const formatUsedTime = app => {
    const { usageHistory } = app;
    const usedTimeInSecond = usageHistory ? usageHistory[todayKey] || 0 : 0;
    if (usedTimeInSecond < 60) {
      return `${usedTimeInSecond}s`; // less than a minute
    }

    const minutes = Math.floor(usedTimeInSecond / 60);
    if (minutes < 60) {
      return `${minutes}m`; // show in minutes if < 1h
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    // If exact hour
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.appContainer}>
      <View style={styles.appDetails}>
        <Image source={{ uri: item.iconBase64 }} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.appName}>{item.appName}</Text>
          <Text style={styles.timeInfo}>⏱ Limit: {formatTime(item)}</Text>
          <Text style={styles.timeInfo}>🕒 Used: {formatUsedTime(item)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {/* Increase Button */}
        <Pressable
          style={[styles.button, styles.increaseButton]}
          onPress={() => handleIncrease(item)}
        >
          <Text style={styles.buttonText}>+10 min</Text>
        </Pressable>

        {/* Decrease Button */}
        <Pressable
          style={[styles.button, styles.decreaseButton]}
          onPress={() => handleDecrease(item)}
        >
          <Text style={styles.buttonText}>-10 min</Text>
        </Pressable>

        {/* Reset Button (kept same) */}
        {/* <Pressable
          onPress={() => resetHanlder(item)}
          style={[styles.button, styles.resetButton]}
        >
          <Text style={styles.buttonText}>Set Default(30)</Text>
        </Pressable> */}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Manage App Time</Text>
      <FlatList
        data={apps}
        keyExtractor={item => item.packageName}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {/* ============== model 2 for the reset timing and show alert =============== */}
      <Modal visible={modalResetVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Do you want to <Text style={{ color: 'red' }}> Set </Text> Default
              timing of{' '}
              <Text style={{ color: 'red' }}> {selectedApp?.appName} </Text>{' '}
            </Text>
            <View
              style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}
            >
              <Pressable
                style={styles.modalButton}
                onPress={() => resetAppDataHandler(true)}
              >
                <Text style={styles.modalButtonText}>Yes</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => resetAppDataHandler(false)}
              >
                <Text style={[styles.modalButtonText, { color: 'black' }]}>
                  NO
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ManageTime;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  list: {
    paddingBottom: 20,
  },
  appContainer: {
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  appDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 30,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timeInfo: {
    fontSize: 13,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  resetButton: {
    backgroundColor: '#DB4437',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    fontSize: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#4285F4',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelText: {
    color: '#333',
  },
  increaseButton: {
    backgroundColor: '#4CAF50', // green
  },

  decreaseButton: {
    backgroundColor: '#F44336', // red
  },
});
