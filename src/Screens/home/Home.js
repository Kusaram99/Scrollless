import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ImportedApps from './ImportedApps';
import { useAppStorage } from '../../Hooks/useAppStorage';
import { useFocusEffect } from '@react-navigation/native';

const Home = () => {
  const [importedApps, setImportedApps] = useState([]);
  const { getApps } = useAppStorage();

  useFocusEffect(
    useCallback(() => {
      const fetchApps = async () => {
        try {
          const apps = await getApps();
          // Transform the object into an array
          const usageArray = Object.entries(apps).map(([pkg, data]) => ({
            packageName: pkg,
            ...data,
          }));
          setImportedApps(usageArray);
        } catch (error) {
          console.error('Error fetching imported apps:', error);
        }
      };

      fetchApps();
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Home</Text>
      <View style={styles.contentWrapper}>
        <Text style={{ fontWeight: '500', textAlign: 'center' }}>
          Total Used time: <Text>00.00</Text>
        </Text>
      </View>
      <ImportedApps apps={importedApps} />
    </View>
  );
};

export default Home;

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
  contentWrapper: {
    paddingVertical: 10,
  },
});
