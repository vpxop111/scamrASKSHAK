import {useState} from 'react';
import {
  Button,
  StyleSheet,
  Text,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function SS() {
  // State to hold the selected image
  const [image, setImage] = useState(null);

  // State to hold extracted text
  const [extractedText, setExtractedText] = useState('');

  // Function to pick an image from the device's gallery
  const pickImageGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      // Perform OCR on the selected image
      performOCR(result.assets[0]);
      // Set the selected image in state
      setImage(result.assets[0].uri);
    }
  };

  // Function to capture an image using the device's camera
  const pickImageCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      // Perform OCR on the captured image
      performOCR(result.assets[0]);
      // Set the captured image in state
      setImage(result.assets[0].uri);
    }
  };

  // Function to perform OCR on an image and extract text
  const performOCR = file => {
    let myHeaders = new Headers();
    myHeaders.append('apikey', 'YOUR_API_KEY_HERE'); // Replace with your API key
    myHeaders.append('Content-Type', 'application/json');

    let formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });

    let requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: formData,
    };

    // Send a POST request to the OCR API
    fetch('https://api.apilayer.com/image_to_text/upload', requestOptions)
      .then(response => response.json())
      .then(result => {
        // Set the extracted text in state
        setExtractedText(result.all_text || 'No text found');
      })
      .catch(error => console.log('error', error));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Welcome to Image to Text App</Text>
      <Button title="Pick an image from gallery" onPress={pickImageGallery} />
      <Button title="Pick an image from camera" onPress={pickImageCamera} />
      {image && <Image source={{uri: image}} style={styles.image} />}
      <Text style={styles.text1}>Extracted text:</Text>
      <Text style={styles.text1}>{extractedText}</Text>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'green',
  },
  image: {
    width: 400,
    height: 300,
    objectFit: 'contain',
    marginTop: 20,
  },
  text1: {
    fontSize: 16,
    marginTop: 20,
    color: 'black',
    fontWeight: 'bold',
  },
});
