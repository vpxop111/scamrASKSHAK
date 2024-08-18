import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {supabase} from '../supabase'; // Adjust the import path if necessary

const Usa_law = ({route}) => {
  const {stype1} = route.params;
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch solutions details where scam_type equals stype1
        const {data, error} = await supabase
          .from('usa_law')
          .select('scam_name, usa_law')
          .eq('scam_type', stype1);

        if (error) {
          console.error('Error fetching solutions:', error.message);
          return;
        }

        setSolutions(data);
      } catch (error) {
        console.error('Error fetching details:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [stype1]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Details for {stype1}</Text>
      <ScrollView>
        {solutions.length > 0 ? (
          <View>
            {solutions.map((solu, index) => (
              <View key={index} style={styles.solutionContainer}>
                <Text style={styles.scamName}>Scam Name: {solu.scam_name}</Text>
                <Text style={styles.solution}>Indain_law: {solu.usa_law}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text>No details found for {stype1}</Text>
        )}
      </ScrollView>
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
  scamName: {
    fontSize: 18,
    marginBottom: 10,
  },
  solution: {
    fontSize: 16,
    marginBottom: 20,
  },
  solutionContainer: {
    marginBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Usa_law;
