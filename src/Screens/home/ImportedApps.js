import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 3 - 20;

const ImportedApp = ({ apps }) => {

  console.log("ImportedApps component received apps: ", apps); 


  const renderItem = ({ item }) => (
    <View style={styles.appContainer}>
      <Image source={{ uri: item.iconBase64 }} style={styles.icon} />
      <Text style={styles.appName} numberOfLines={1}>
        {item.appName}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={apps}
      renderItem={renderItem}
      keyExtractor={(item) => item.packageName}
      numColumns={3}
      contentContainerStyle={styles.grid}
    />
  );
};

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 10,
  },
  appContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginVertical: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 30,
    marginBottom: 6,
  },
  appName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
});

export default ImportedApp;
