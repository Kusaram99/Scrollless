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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [newLimit, setNewLimit] = useState('');
  const [modalResetVisible, setModalResetVisible] = useState(false);
  // const [resetApp, setResetApp] = useState(null);
  const todayKey = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  }); // YYYY-MM-DD

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

  // get today key

  // handle set limit press
  const handleSetLimitPress = app => {
    setSelectedApp(app);
    setNewLimit(app.timeLimitInMinutes.toString());
    setModalVisible(true);
  };

  // update timing handler
  const handleSave = async () => {
    if (!newLimit || isNaN(newLimit)) return; // Validate input(check if newLimit is not empty and is a number) 
    // get today's key
    const todayKey = getTodayKey();
    // console.log("Today's key: ", key);

    const { usageHistory } = selectedApp;

    // if usageHistory is undefined
    if (!usageHistory) return;
    // reset today's usage to 0 and time limit to default 30 minutes
    const updatedApp = {
      ...selectedApp,
      timeLimitInMinutes: parseInt(newLimit), // set custom time limit
      usageHistory: { ...usageHistory, [todayKey]: 0 }, // reset today's usage to 0
    };

    await updateApp(updatedApp.packageName, updatedApp); // save updated data
    const updatedApps = apps.map(app =>
      app.packageName === updatedApp.packageName ? updatedApp : app,
    );

    // update state to reflect changes in UI
    setApps(updatedApps);
    setModalVisible(false);
    setSelectedApp(null);
  };

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
        // reset today's usage to 0 and time limit to default 30 minutes
        const updatedApp = {
          ...selectedApp,
          timeLimitInMinutes: 30, // reset to default 30 minutes
          usageHistory: { ...usageHistory, [todayKey]: 0 }, // reset today's usage to 0
        };

        await updateApp(updatedApp.packageName, updatedApp); // save updated data
        const updatedApps = apps.map(app =>
          app.packageName === updatedApp.packageName ? updatedApp : app,
        );
        setApps(updatedApps);
        setSelectedApp(null);
      }
      setModalResetVisible(false);
      console.log('resetAppDataHandler isReady: ', isReady);
    } catch (error) {
      console.error('Error in resetAppDataHandler:', error);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.appContainer}>
      <View style={styles.appDetails}>
        <Image source={{ uri: item.iconBase64 }} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.appName}>{item.appName}</Text>
          <Text style={styles.timeInfo}>
            ⏱ Limit: {item.timeLimitInMinutes} min
          </Text>
          <Text style={styles.timeInfo}>
            🕒 Used: {item.usageHistory[todayKey]} min
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.button}
          onPress={() => handleSetLimitPress(item)}
        >
          <Text style={styles.buttonText}>Custom time limit</Text>
        </Pressable>
        <Pressable
          onPress={() => resetHanlder(item)}
          style={[styles.button, styles.resetButton]}
        >
          <Text style={[styles.buttonText]}>Reset & inc 30 min</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>⏳ Manage App Time</Text>
      <FlatList
        data={apps}
        keyExtractor={item => item.packageName}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {/* Modal for setting time limit */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Set Time Limit for{' '}
              <Text style={{ color: 'red' }}> {selectedApp?.appName}</Text>
            </Text>
            <Text
              style={{
                marginTop: 5,
                marginBottom: 3,
                fontSize: 10,
                fontWeight: '500',
              }}
            >
              Add Time In Minutes:{' '}
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Enter time in minutes"
              value={newLimit}
              onChangeText={setNewLimit}
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButton} onPress={handleSave}>
                <Text style={styles.modalButtonText}>Save</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelText]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============== model 2 for the reset timing and show alert =============== */}
      <Modal visible={modalResetVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Do you want to <Text style={{ color: 'red' }}> Reset </Text>{' '}
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
});
