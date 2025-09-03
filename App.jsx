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
import Ionicons from 'react-native-vector-icons/Ionicons';
import Home from './src/Screens/home/Home';
import ImportApp from './src/Screens/importApp/ImportApp';
import ManageTime from './src/Screens/manageTime/ManageTime';
import RemixIcon from "react-native-remix-icon";

// hooks
import { useAppStorage } from './src/Hooks/useAppStorage';
// context api
import { useAppUsage } from './src/contextAPI/contextapi';

const { ForegroundApp, InstalledApps } = NativeModules;
const getTodayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// Want old code=========================================== Replace time tracking with context api to state management
const App = () => { 
  // hook functions
  const { getApps, updateUsedTime } = useAppStorage();
  const lastAppRef = useRef(null);
  const lastTimestampRef = useRef(null); 

  // current app vi
  const appUsageRef = useRef(null);

  // context api
  const { usageData, setUsageData } = useAppUsage();
  console.log('usageData from context: ', usageData);

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const initializeImportedApps = useCallback(async () => { 
     // for testing only

    const storedApps = await getApps();
    console.log('storedApps from storage: ', storedApps);

    // update ref
    appUsageRef.current = storedApps; // Store in ref for quick access 

    // start background service
    startBackgroundService();
    Alert.alert('🎉 Setup Done', 'Background service started');
  }, []);

  // const saveAppUsage = useCallback(async updated => {
  //   setAppUsage(prev => ({ ...prev, ...updated }));
  //   // await AsyncStorage.setItem('@importedAppsUsage', JSON.stringify(updated));
  // }, []);

  // Function to show blocking alert when time limit is exceeded
  const showBlockingAlert = useCallback(
    async (appName, updatedAppData, packageName) => {
      console.log('blockAlert: ==============: ', appName);
      const now = Date.now();
      const lastNotified = updatedAppData.lastNotifiedAt || 0;

      if (now - lastNotified > 10000) {
        await ForegroundApp.showOverlay(appName, 'Your time limit is exceeded');

        console.log('showBlockingAlert: ', packageName);
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
      // 1️⃣ Check if the screen is ON using native module
      const isScreenOn = await ForegroundApp.isScreenOn();
      console.log('isScreenOn:', isScreenOn);
      // 2️⃣ If screen is OFF, skip tracking logic and reset references
      if (!isScreenOn) {
        console.log('Screen is off. Skipping usage tracking.');

        // Reset last known app and timestamp to avoid counting incorrect time
        lastAppRef.current = null;
        lastTimestampRef.current = null;
        return; // Exit early since there's nothing to track when screen is off
      }

      // 4️⃣ Get the currently open foreground app from native code
      const packageName = await ForegroundApp.getCurrentForegroundApp();
      lastAppRef.current = packageName; // Update last known app
      console.log('Current foreground app:', packageName);
      updatePackageTracking(); // Call to update package tracking

      // update lastAppRef
    } catch (err) {
      // 2️⃣1️⃣ Catch and log any errors from native calls or logic
      console.warn(err.code);
      // check app is still in foreground
      if (err.code === 'NO_APP') {
        await updatePackageTracking();
      }
      console.log('Error in foreground detection:', err.message);
    }
  }, []);
  // }, [appUsage, saveAppUsage, showBlockingAlert]);

  // update current package tracking
  const updatePackageTracking = async _ => {
    try {
      // 5️⃣ Get the current time in milliseconds
      const currentTime = Date.now();
      // console.log('appUsage===:-------- ', appUsage);
      // 6️⃣ Retrieve the previously stored app and its timestamp
      const lastApp = lastAppRef.current;
      const lastTimestamp = lastTimestampRef.current;
      const appUsage = appUsageRef.current || {};
      console.log('lastApp===: ', lastApp);

      // 7️⃣ If we were tracking the same app and timestamp is valid
      if (appUsage[lastApp] && lastTimestamp) {
        // 8️⃣ Calculate time spent in this app since the last check (in seconds)
        const deltaSeconds = Math.floor((currentTime - lastTimestamp) / 1000);
        console.log('deltaSeconds=======: ', deltaSeconds);

        if (deltaSeconds > 0) {
          // 9️⃣ Make a copy of the app usage object to update it
          const updated = { ...appUsage };

          // 🔟 Get today's date key to store daily usage (e.g., "2025-08-07")
          const todayKey = getTodayKey();

          // 1️⃣1️⃣ If this app is in the tracked list
          if (updated[lastApp]) {
            // 1️⃣2️⃣ Get existing usage or 0 if not present for today
            const currentUsage = updated[lastApp].usageHistory[todayKey] || 0;
            const total_used_time = updated[lastApp].usageHistory[todayKey+':total_used'] || 0;

            console.log("youuooooo:---------------- ", updated[lastApp].usageHistory[todayKey+':total_used'])

            // 1️⃣3️⃣ Add the new duration to existing usage
            updated[lastApp].usageHistory[todayKey] =
              currentUsage + deltaSeconds;
            // updating totaled used time of today (included with increased or reset time)
            updated[lastApp].usageHistory[todayKey+':total_used'] = total_used_time + deltaSeconds
            
            // 1️⃣4️⃣ Get usage limit in seconds (limit is stored in minutes)
            const limit = updated[lastApp].timeLimitInMinutes * 60;

            // 1️⃣5️⃣ If user has crossed the time limit
            console.log(
              `Time limit is exceeded for ${lastApp}: `,
              updated[lastApp].usageHistory[todayKey],
            );
            if (updated[lastApp].usageHistory[todayKey] >= limit) {
              // 1️⃣6️⃣ Show a blocking alert and update that app’s data
              updated[lastApp] = await showBlockingAlert(
                updated[lastApp].appName,
                updated[lastApp],
                lastApp,
              );
            }

            // appUsageRef.current = updated; // Update the ref with new data
            // await updateUsedTime(updated); // Persist the updated usage data
           await updateAppData(updated);
            console.log('Updated usage data saved.');
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
      console.warn("error in updatePackageTracking func: ", err);
    }
  };

  // update app data
  const updateAppData = async (data)=>{
    // console.log('updateAppData -------------: ', data.packageName);
    // update data in localstorage
    await updateUsedTime(data);
    // get updated data from localstorage
    const updatedData = await getApps()
    // update data for current tracking
    appUsageRef.current = updatedData;
    return
  }

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
        'Please grant Usage Access Permission Or Make sure it is Allowed.',
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
    ForegroundApp.showOverlay(
      'appName',
      'Your time limit is exceeded Your time limit is exceeded Your time limit is exceeded',
    );
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

          if (route.name === "Home") {
            iconName = focused ? "home-5-fill" : "home-5-line";
          } else if (route.name === "Import App") {
            iconName = focused ? "apps-2-fill" : "apps-2-line";
          } else if (route.name === "Manage Time") {
            iconName = focused ? "time-fill" : "time-line";
          }

          return <RemixIcon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Manage Time" component={ManageTime} />
      <Tab.Screen name="Import App" component={ImportApp} />
    </Tab.Navigator>
  );
}; 

export default App;

// =======================================================

// check current app is in list and manage time
// 1. If app is not in list then do nothing
// 2. if foreground app is in list then update timestamp that for do next task 3
// 3. If foreground app is new then update last app and timestamp from start
// 4. after this return true
// 5. do next process of updatePackageTracking()

// CASE:
// 1. In first time it returns package name
// 2. In second time it rreturns "NO_APP" error
// 3. Again app changes it returns package name and again "NO_APP" error
// 4. If screen is off then lastAppRef.current = null; lastTimestampRef.current = null;
// When screen is on then again getCurrentAppUsageDuration() will call and it will return package name
// and again return "NO_APP" error

// TASK:
// 1. Update the current app usage duration from opening to closing
// 2. If current package is in list then start counting time then whenever
// getCurrentAppUsageDuration() return 'NO_APP' error till app does not change
// - So count time continue till app does not change
// - If app change and current package is not in list then set lastAppRef.current = null; lastTimestampRef.current = null;

// Solution:
//

// ============ It is OK
// If foreground app is not in list then do nothing
// If foreground app is new and it is in list then update timestamp with current time else don't update timestamp
// If foreground app is in list then update timestamp with current time ===> (Wrong logic)
// -  If I do this then time count will be 0 or wrong
// previous package and current package is same and it is in list
// update current app timestamp

// =======================================================================

// console.log('Current foreground app:', packageName);

// lastAppRef.current = packageName;
// calling updatePackageTracking
// If foreground app is new
// when screen will off then lastAppRef.current = null; // tow way to set null, 1. in app starting, 2. when screen is off
// lastTimestampRef.current = null; // two way to set null, 1. in app starting, 2. when screen is off

// case 1: when app start Then getCurrentForegroundApp() returns current foreground app 2 times after returns "NO_APP" Error
// case 2: When foreground app is changed then again getCurrentForegroundApp() returns current foreground app 2 times after returns "NO_APP" Error
// case 3: when screen will off: lastAppRef.current = null; lastTimestampRef.current = null; in screen on case 1.

// DO
// You have to manage timeStamp of app in only Try
// Assume after ruterning package name 2 times When
// -"NO_APP" error will come that time consider your current foreground app is still in foreground.
// When screen off:
// - Do lastAppRef.current = null; lastTimestampRef.current = null;
// - because we want to check again current app again

//  it is in list then update timestamp with current time else don't update timestamp
// if (checkCurrentApp(packageName)) {

// }
// await updatePackageTracking();

// =================================================================================

// =============== goal
// if app in list then add used time in its data
// update last used time
// when screen is off:     lastAppRef.current = null;
// lastTimestampRef.current = 0;
