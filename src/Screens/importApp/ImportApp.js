import { StyleSheet, Text, View, Image, Switch, FlatList } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { getInstalledApps } from '../InstalledApps';
import { useAppStorage } from '../../Hooks/useAppStorage';
import { useFocusEffect } from '@react-navigation/native';

const ImportApp = () => {
  const [apps, setApps] = useState([]);
  const [toggleStates, setToggleStates] = useState({});
  const { saveApps, deleteApp, getApps } = useAppStorage();
  const [loader, setLoader] = useState(false);

  // Load installed apps + mark ON/OFF based on saved apps
  useEffect(() => {
    const loadApps = async () => {
      try {
        // start loading
        setLoader(true);
        // fetching apps from device
        const installedApps = await getInstalledApps();
        // fetching apps from localstorage
        const savedApps = await getApps();
        // console.log('installedApps: ', installedApps);

        // Extract all imported packageNames
        const importedPackages = Object.keys(savedApps);

        // Create toggle states based on stored data
        const toggles = {};
        installedApps.forEach(app => {
          toggles[app.packageName] = importedPackages.includes(app.packageName);
        });

        // console.log('toggles: ', toggles);

        setApps(installedApps);
        setToggleStates(toggles);
      } catch (err) {
        console.error('Failed to load apps or toggles', err);
      } finally {
        setLoader(false);
      }
    };

    loadApps();
  }, []);

  // Handle toggle change
  const handleToggle = async item => {
    const isCurrentlyOn = toggleStates[item.packageName];

    const updatedToggles = {
      ...toggleStates,
      [item.packageName]: !isCurrentlyOn,
    };

    setToggleStates(updatedToggles);

    const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (!isCurrentlyOn) {
      // Turning ON – Save to storage
      const appData = {
        packageName: item.packageName,
        appName: item.appName,
        iconBase64: `data:image/png;base64,${item.iconBase64}`,
        timeLimitInMinutes: 1, // Default limit to 30 mins
        usageHistory: { [todayKey]: 0 }, // Initialize today's usage to 0
        lastNotifiedAt: null,
      };
      await saveApps(appData);
    } else {
      // Turning OFF – Remove from storage
      await deleteApp(item.packageName);
    }
  };

  // Render each app with toggle
  const renderApp = ({ item }) => (
    <View style={styles.appItem}>
      <Image
        source={{ uri: `data:image/png;base64,${item.iconBase64}` }}
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={styles.appName}>{item.appName}</Text>
        {/* <Text style={styles.pkgName}>{item.packageName}</Text> */}
      </View>
      <Switch
        value={toggleStates[item.packageName] || false}
        onValueChange={() => handleToggle(item)}
      />
    </View>
  );

  // loader
  if (loader) {
    return <Text style={styles.loading}>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Import Application</Text>
      <FlatList
        data={apps}
        keyExtractor={item => item.packageName}
        renderItem={renderApp}
        contentContainerStyle={styles.list}
      />
    </View> 
  );
};

export default ImportApp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    // paddingBottom: 10,
    paddingHorizontal: 20,
  },
  heading: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 12,
  },
  list: {
    padding: 10,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pkgName: {
    fontSize: 12,
    color: '#666',
  },
  loading: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 100,
  },
});
