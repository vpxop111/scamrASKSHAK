import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {supabase} from '../supabase'; // Adjust the import path if necessary

const Resource = ({route}) => {
  const {stype1} = route.params;
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        // Fetch resource details where scam_type equals stype1
        const {data, error} = await supabase
          .from('resource')
          .select('scam_name, Resource, Resource_link')
          .eq('scam_type', stype1);

        if (error) {
          console.error('Error fetching resources:', error.message);
          return;
        }

        setResources(data);
      } catch (error) {
        console.error('Error fetching details:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [stype1]);

  const openResourceLink = url => {
    Linking.openURL(url).catch(err =>
      console.error('Failed to open resource link:', err),
    );
  };

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
        {resources.length > 0 ? (
          <View>
            {resources.map((resource, index) => (
              <View key={index} style={styles.solutionContainer}>
                <Text style={styles.scamName}>
                  Scam Name: {resource.scam_name}
                </Text>
                <Text style={styles.solution}>
                  Resource: {resource.Resource}
                </Text>
                {resource.Resource_link && (
                  <TouchableOpacity
                    onPress={() => openResourceLink(resource.Resource_link)}>
                    <Text style={styles.link}>{resource.Resource_link}</Text>
                  </TouchableOpacity>
                )}
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
    marginBottom: 10,
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
    marginBottom: 10,
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

export default Resource;
