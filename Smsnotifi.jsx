import React, {useState, useEffect, useContext} from 'react';
import {View, Text, StyleSheet, FlatList, Alert} from 'react-native';
import {supabase} from './supabase'; // Import your Supabase client instance
import {AuthContext} from './AuthContext'; // Import AuthContext to get the current user's email

const Smsnotifi = () => {
  const [scamMessages, setScamMessages] = useState([]);
  const [timer, setTimer] = useState(null);
  const {user} = useContext(AuthContext); // Use AuthContext to get the current user's email

  useEffect(() => {
    if (user && user.email) {
      fetchScamMessages();

      // Set up a timer to fetch scam messages every 5 minutes
      const interval = setInterval(() => {
        fetchScamMessages();
      }, 5 * 60 * 1000); // 5 minutes in milliseconds

      // Clean up the timer on component unmount
      return () => clearInterval(interval);
    } else {
      Alert.alert(
        'User not authenticated',
        'Please log in to see scam messages.',
      );
    }
  }, [user]);

  const fetchScamMessages = async () => {
    if (!user || !user.email) return;

    try {
      const {data, error} = await supabase
        .from('scamsms')
        .select('scam_no, scam_mes, sid')
        .eq('sid', user.email); // Fetch messages where sid matches current user's email

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setScamMessages(data);
      } else {
        Alert.alert('No Scam Messages', 'No scam messages found.');
      }
    } catch (error) {
      console.error('Error fetching scam messages:', error);
      Alert.alert('Error', 'Failed to fetch scam messages. Please try again.');
    }
  };

  const renderItem = ({item}) => (
    <View style={styles.item}>
      <Text style={styles.text}>Phone Number: {item.scam_no}</Text>
      <Text style={styles.text}>Message: {item.scam_mes}</Text>
      <Text style={styles.text}>Sender: {item.sid}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Scam Messages</Text>
      <FlatList
        data={scamMessages}
        renderItem={renderItem}
        keyExtractor={item => item.scam_no + item.sid} // Assuming scam_no and sid combination is unique
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  item: {
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    marginBottom: 4,
  },
});

export default Smsnotifi;
