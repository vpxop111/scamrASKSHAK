import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

export default function App() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickImageFromGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorMessage) {
          console.log('ImagePicker Error: ', response.errorMessage);
        } else if (response.assets) {
          const uri = response.assets[0].uri;
          setImage(uri);
          console.log('Image picked from gallery: ', response.assets[0]); // Log image details
          performOCR(response.assets[0]);
        }
      },
    );
  };

  const captureImageFromCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        includeBase64: false,
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorMessage) {
          console.log('Camera Error: ', response.errorMessage);
        } else if (response.assets) {
          const uri = response.assets[0].uri;
          setImage(uri);
          console.log('Image captured from camera: ', response.assets[0]); // Log image details
          performOCR(response.assets[0]);
        }
      },
    );
  };

  const performOCR = async (file) => {
    const formData = new FormData();

    // Log file info before sending
    console.log('Preparing image for OCR: ', file);

    formData.append('image', {
      uri: file.uri,
      name: file.fileName || 'photo.jpg',
      type: file.type || 'image/jpeg',
    });

    console.log('FormData created:', formData); // Log FormData details

    setLoading(true);

    try {
      console.log('Sending image to OCR API...');

      const response = await axios.post('https://api.api-ninjas.com/v1/imagetotext', formData, {
        headers: {
          'X-Api-Key': 'eMe25+H2EpVZlz/rFaSASA==sH6conkNDWj6uNF0', // Replace with your actual API key
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('OCR API Response:', response.data); // Log entire response data from the API

      // Check if data exists in the response
      if (response.data && Array.isArray(response.data)) {
        const textArray = response.data.map(item => item.text);
        console.log('Text Array:', textArray); // Log the array of text items

        // Break the extracted text into sentences
        const sentences = textArray.join(' ').split(/(?<=[.!?])\s+/); // Split by punctuation followed by whitespace
        console.log('Extracted Sentences:', sentences); // Log the extracted sentences
        setExtractedText(sentences);
      } else {
        console.log('No text found in response data');
        setExtractedText(['No text found']);
      }

    } catch (error) {
      // Log error details
      console.error('Error performing OCR:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data); // Log server response errors
      }
      Alert.alert('Error', 'Failed to extract text from image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image to Text App</Text>
      <Button title="Pick an Image from Gallery" onPress={pickImageFromGallery} />
      <Button title="Capture Image from Camera" onPress={captureImageFromCamera} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <Text style={styles.extractedTextTitle}>Extracted Text:</Text>
      {extractedText.map((sentence, index) => (
        <Text key={index} style={styles.extractedText}>{sentence}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginVertical: 10,
  },
  extractedTextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  extractedText: {
    fontSize: 16,
    marginTop: 10,
    color: 'black',
    textAlign: 'center',
  },
});
