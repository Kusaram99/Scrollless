import {
  StyleSheet,
  Text,
  View,
  NativeModules,
  Pressable,
  Alert,
} from 'react-native';

const { ForegroundApp } = NativeModules;

const Setting = () => {
  // check grand access of application
  const isGrandAccesAllowed = async () => {
    const granted = await ForegroundApp.isUsageAccessGranted();
    // console.log('granted Access: ', granted);
    if (granted) {
      Alert.alert('Access Granted', 'Usage access is already allowed.');
      return;
    }
    // setToggle_Option(!toggle_option);
    ForegroundApp.openUsageSettings();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Setting</Text>
      <View style={styles.switchView}>
        <Text style={styles.optionText}>
          If application is not tracking foreground application then please make
          sure this application is allowed in the setting
        </Text>
        {/* Decrease Button */}
        <Pressable
          style={styles.onPressBtn}
          onPress={() => isGrandAccesAllowed()}
        >
          <Text style={styles.btnText}>Check</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: 30,
  },
  heading: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 12,
  },
  switchView: {
    flexDirection: 'row', // make items side-by-side
    justifyContent: 'space-evenly', // even spacing
    alignItems: 'center', // vertical center
    paddingVertical: 10,
    width: '100%',
    gap: 10,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b8888ff',
    width: '70%',
  },
  onPressBtn: { padding: 10, borderRadius: 8, backgroundColor: '#e0e0e0' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#363193ff' },
});

export default Setting;
