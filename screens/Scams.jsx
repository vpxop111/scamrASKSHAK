import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, StyleSheet, Button} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {supabase} from '../supabase'; // Adjust the import path if necessary

export default function Scams() {
  const [scams, setScams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const getScams = async () => {
      try {
        const {data, error} = await supabase.from('scam').select();

        if (error) {
          console.error('Error fetching scams:', error.message);
          return;
        }

        if (data) {
          // Filter out duplicate scam types
          const uniqueScams = Array.from(
            new Set(data.map(scam => scam.scam_type)),
          ).map(scam_type => data.find(scam => scam.scam_type === scam_type));
          setScams(uniqueScams);
        }
      } catch (error) {
        console.error('Error fetching scams:', error.message);
      } finally {
        setLoading(false);
      }
    };

    getScams();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (scams.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No scams found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scam List</Text>
      <FlatList
        data={scams}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.item}>
            <Button
              style={styles.itemText}
              title={item.scam_type}
              onPress={() =>
                navigation.navigate('mscam', {
                  stype: item.scam_type,
                  s_id: item.id,
                })
              }
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemText: {
    fontSize: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
