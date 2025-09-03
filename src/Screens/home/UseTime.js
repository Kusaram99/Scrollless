import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

const UseTime = () => {
  return (
    <View>
      <Text style={styles.boldText}>
        Used time: <Text style={styles.lightText}>50 Minutes</Text>
      </Text>
    </View>
  );
};

export default UseTime;

const styles = StyleSheet.create({
  boldText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
  },
  lightText: {
    fontWeight: '500',
    fontSize: 10,
  },
});
