import { StyleSheet, Text, View, Image, Switch, FlatList } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getInstalledApps } from '../InstalledApps';
import { useAppStorage } from '../../Hooks/useAppStorage';

const ImportApp = () => {
  const [apps, setApps] = useState([]);
  const [toggleStates, setToggleStates] = useState({});
  const { saveApps, deleteApp, getApps } = useAppStorage();

  // Load installed apps + mark ON/OFF based on saved apps
  useEffect(() => {
    const loadApps = async () => {
      try {
        const installedApps = await getInstalledApps();
        const savedApps = await getApps();
        console.log('installedApps: ', installedApps);

        // Extract all imported packageNames
        // const importedPackages = savedApps.map(app => app.packageName);
        const importedPackages = Object.keys(savedApps);

        // Create toggle states based on stored data
        const toggles = {};
        installedApps.forEach(app => {
          toggles[app.packageName] = importedPackages.includes(app.packageName);
        });

        setApps(installedApps);
        setToggleStates(toggles);
      } catch (err) {
        console.error('Failed to load apps or toggles', err);
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
        timeLimitInMinutes: 20, // Default limit to 30 mins
        usageHistory: { [todayKey]: 0, [todayKey + ':total_used']: 0 },
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
        <Text style={styles.pkgName}>{item.packageName}</Text>
      </View>
      <Switch
        value={toggleStates[item.packageName] || false}
        onValueChange={() => handleToggle(item)}
      />
    </View>
  );

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
    padding: 20,
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
});
