import React from 'react';
import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function Forgotpass({navigation}) {
  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.blueText}>Forgot</Text>
        <View style={styles.passwordRow}>
          <Text style={styles.blackText}>password</Text>
          <Text style={styles.blueText}>?</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('welcome')}>
            <Text style={styles.buttonText}>Sent Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  blueText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0029FF',
    marginLeft: 8,
  },
  blackText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'black',
    marginLeft: 8,
    marginTop: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  inputContainer: {
    width: '100%',
    height: 60,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'black',
    marginTop: 40,
    justifyContent: 'center',
    paddingLeft: 20,
  },
  input: {
    fontSize: 18,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  button: {
    paddingVertical: 16,
    backgroundColor: '#0029FF',
    borderRadius: 50,
    width: 240,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
