import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {supabase} from '../supabase'; // Adjust the import path if necessary

const Scam1 = ({route}) => {
  const {stype1} = route.params;
  const [scams, setScams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScams = async () => {
      try {
        const {data, error} = await supabase
          .from('scam')
          .select('*')
          .eq('scam_type', stype1); // Compare "scam_type" with "stype1"

        if (error) {
          console.error('Error fetching scams:', error.message);
          return;
        }

        if (data && data.length > 0) {
          setScams(data);
        } else {
          setScams([]);
        }
      } catch (error) {
        console.error('Error fetching scams:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScams();
  }, [stype1]); // Fetch again when stype1 changes

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scam List for {stype1}</Text>
      {scams.length > 0 ? (
        <View>
          {scams.map(scam => (
            <Text key={scam.id}>{scam.scam_name}</Text>
          ))}
        </View>
      ) : (
        <Text>No scams found for {stype1}</Text>
      )}
    </View>
  );
};

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Scam1;
