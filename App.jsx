import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  NativeModules,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundService from 'react-native-background-actions';

// imported data for tab's functionalities
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Home from './src/Screens/home/Home';
import ImportApp from './src/Screens/importApp/ImportApp';
import ManageTime from './src/Screens/manageTime/ManageTime';
import Setting from './src/Screens/setting/Setting';
import RemixIcon from 'react-native-remix-icon';

// hooks
import { useAppStorage } from './src/Hooks/useAppStorage';
// context api
// import { useAppUsage } from './src/contextAPI/contextapi';

const { ForegroundApp, InstalledApps } = NativeModules;
const getTodayKey = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Want old code=========================================== Replace time tracking with context api to state management
const App = () => {
  // hook functions
  const { getApps, updateUsedTime } = useAppStorage();
  const lastAppRef = useRef(null);
  const lastTimestampRef = useRef(null);

  // current app vi
  const appUsageRef = useRef(null);

  // context api
  // const { usageData, setUsageData } = useAppUsage();
  // console.log('usageData from context: ', usageData);

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const initializeImportedApps = useCallback(async () => {
    // for testing only

    const storedApps = await getApps();
    // console.log('storedApps from storage: ', storedApps);

    // update ref
    appUsageRef.current = storedApps; // Store in ref for quick access

    // start background service
    startBackgroundService();
    Alert.alert('🎉 Setup Done', 'Background service is started');
  }, []);

  // const saveAppUsage = useCallback(async updated => {
  //   setAppUsage(prev => ({ ...prev, ...updated }));
  //   // await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(updated));
  // }, []);

  // Function to show blocking alert when time limit is exceeded
  const showBlockingAlert = useCallback(
    async (appName, updatedAppData, packageName) => {
      // console.log('blockAlert: ==============: ', appName);
      const now = Date.now();
      const lastNotified = updatedAppData.lastNotifiedAt || 0;

      if (now - lastNotified > 10000) {
        await ForegroundApp.showOverlay(
          appName,
          'Time’s up! Let’s get back to your goals 💪',
        );

        // console.log('showBlockingAlert: ', packageName);
        // Update last notified time
        updatedAppData.lastNotifiedAt = now;
      }

      return updatedAppData;
    },
    [],
  );

  // Define a memoized function to track foreground app usage time.
  // It uses useCallback to avoid unnecessary re-creations of the function.
  const getCurrentAppUsageDuration = useCallback(async () => {
    try {
      // Check if the screen is ON using native module
      const isScreenOn = await ForegroundApp.isScreenOn();
      // console.log('isScreenOn:', isScreenOn);
      // If screen is OFF, skip tracking logic and reset references
      if (!isScreenOn) { 

        // Reset last known app and timestamp to avoid counting incorrect time
        lastAppRef.current = null;
        lastTimestampRef.current = null;
        return; // Exit early since there's nothing to track when screen is off
      }

      // Get the currently open foreground app from native code
      const packageName = await ForegroundApp.getCurrentForegroundApp();
      lastAppRef.current = packageName; // Update last known app
      // console.log('Current foreground app:', packageName);
      updatePackageTracking(); // Call to update package tracking

      // update lastAppRef
    } catch (err) {
      // Catch and log any errors from native calls or logic
      console.warn(err.code);
      // check app is still in foreground
      if (err.code === 'NO_APP') {
        await updatePackageTracking();
      }
      // console.warn('Error in foreground detection:', err);
    }
  }, []);
  // }, [appUsage, saveAppUsage, showBlockingAlert]);

  // update current package tracking
  const updatePackageTracking = async _ => {
    try {
      // Get the current time in milliseconds
      const currentTime = Date.now();
      // console.log('appUsage===:-------- ', appUsage);
      // Retrieve the previously stored app and its timestamp
      const lastApp = lastAppRef.current;
      const lastTimestamp = lastTimestampRef.current;
      const appUsage = appUsageRef.current || {};
      // console.log('lastApp===: ', lastApp);
      // console.log('appUsage===: ', appUsage);

      // If we were tracking the same app and timestamp is valid
      if (appUsage[lastApp] && lastTimestamp) {
        // Calculate time spent in this app since the last check (in seconds)
        const deltaSeconds = Math.floor((currentTime - lastTimestamp) / 1000);
        // console.log('deltaSeconds=======: ', deltaSeconds);

        if (deltaSeconds > 0) {
          // Make a copy of the app usage object to update it
          const updated = { ...appUsage };

          // Get today's date key to store daily usage (e.g., "2025-08-07")
          const todayKey = getTodayKey();

          // If this app is in the tracked list
          if (updated[lastApp]) {
            // Get existing usage or 0 if not present for today
            const currentUsage = updated[lastApp].usageHistory[todayKey] || 0;

            // Add the new duration to existing usage
            updated[lastApp].usageHistory[todayKey] =
              currentUsage + deltaSeconds;

            // Get usage limit in seconds (limit is stored in minutes)
            const limit = updated[lastApp].timeLimitInMinutes * 60;

            // If user has crossed the time limit
            // console.log(
            //   `Time limit is exceeded for ${lastApp}: `,
            //   updated[lastApp].usageHistory[todayKey],
            // );
            if (updated[lastApp].usageHistory[todayKey] >= limit) {
              // Show a blocking alert and update that app’s data
              updated[lastApp] = await showBlockingAlert(
                updated[lastApp].appName,
                updated[lastApp],
                lastApp,
              );
            }

            // appUsageRef.current = updated; // Update the ref with new data
            // await updateUsedTime(updated); // Persist the updated usage data
            await updateAppData(lastApp, updated);
            // console.log('Updated usage data saved.');
          }
        }
      }

      // Update last known app and timestamp for the next run
      // lastAppRef.current = packageName;
      if (appUsage[lastApp]) {
        lastTimestampRef.current = currentTime;
      } else {
        lastTimestampRef.current = null;
      }
    } catch (err) {
      console.warn('error in updatePackageTracking func: ', err);
    }
  };

  // update app data
  const updateAppData = async (packageName, data) => {
    // console.log('updateAppData -------------: ', data.packageName);
    const todayKey = getTodayKey();
    // update data in localstorage
    await updateUsedTime(packageName, data);
    // get updated data from localstorage
    const updatedData = await getApps();
    // console.log('updatedData from updateAppData func: ', updatedData);
    // update data for current tracking
    appUsageRef.current = updatedData;
    return;
  };

  // start background service
  const backgroundTask = async ({ delay }) => {
    await new Promise(async () => {
      while (BackgroundService.isRunning()) {
        await getCurrentAppUsageDuration();
        await sleep(delay);
      }
    });
  };

  const serviceOptions = {
    taskName: 'App Tracker',
    taskTitle: 'Tracking Foreground Apps',
    taskDesc: 'Running background service to monitor app usage.',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#ff00ff',
    parameters: {
      delay: 5000,
    },
  };

  // check usage access---------------
  const checkUsageAccess = useCallback(async () => {
    const granted = await ForegroundApp.isUsageAccessGranted();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Please make sure Usage Access Permission is Allowed!',
        [
          {
            text: 'Open Settings',
            onPress: () => ForegroundApp.openUsageSettings(),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, []);

  const startBackgroundService = useCallback(async () => {
    await checkUsageAccess();
    const isRunning = BackgroundService.isRunning();
    if (!isRunning) {
      await BackgroundService.start(backgroundTask, serviceOptions);
    }
  }, []);

  useEffect(() => {
    // ForegroundApp.showOverlay(
    //   'appName',
    //   'Your time limit is exceeded Your time limit is exceeded Your time limit is exceeded',
    // );
    initializeImportedApps();
    checkUsageAccess();
  }, []);

  return (
    <NavigationContainer>
      <View style={styles.mainContainer}>
        <MyTabs />
      </View>
      {/* <MyTabs /> */}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    gap: 10,
  },
  startButton: {
    padding: 12,
    backgroundColor: 'blue',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  darkText: {
    color: '#fff',
  },
});

const MyTabs = () => {
  const Tab = createBottomTabNavigator();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home-5-fill' : 'home-5-line';
          } else if (route.name === 'Import App') {
            iconName = focused ? 'apps-2-fill' : 'apps-2-line';
          } else if (route.name === 'Manage Time') {
            iconName = focused ? 'time-fill' : 'time-line';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings-3-fill' : 'settings-3-line';
          }

          return <RemixIcon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Manage Time" component={ManageTime} />
      <Tab.Screen name="Import App" component={ImportApp} />
      <Tab.Screen name="Settings" tabBarIcon="admin-line" component={Setting} />
    </Tab.Navigator>
  );
};

export default App;
