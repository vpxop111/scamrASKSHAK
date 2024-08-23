import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Welcome from './screens/Welcome';
import Login from './screens/Login';
import Signup from './screens/Signup';
import Forgotpass from './screens/Forgotpass';
import Home from './screens/Home';
import Scams from './screens/Scams';
import Mainscam from './screens/Mainscam';
import Scam1 from './screens/Scam1';
import Solution from './screens/Solution';
import Indian_law from './screens/Indian_law';
import Usa_law from './screens/Usa_law';
import Resource from './screens/Resource';
import Scamai from './screens/Scamai';
import Scamnews from './screens/Scamnews';

export default function App() {
  const Stack = createNativeStackNavigator();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Welcome"
          component={Welcome}
          initialParams={{paramName: 'navigation'}}
        />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="Forgot" component={Forgotpass} />
        <Stack.Screen
          name="home"
          component={Home}
          initialParams={{paramName: 'navigation'}}
        />
        <Stack.Screen
          name="scams"
          component={Scams}
          initialParams={{paramName: 'navigation'}}
        />
        <Stack.Screen name="mscam" component={Mainscam} />
        <Stack.Screen name="scamlist" component={Scam1} />
        <Stack.Screen name="solution" component={Solution} />
        <Stack.Screen name="i_law" component={Indian_law} />
        <Stack.Screen name="u_law" component={Usa_law} />
        <Stack.Screen name="resource" component={Resource} />
        <Stack.Screen name="scamai" component={Scamai} />
        <Stack.Screen name="news" component={Scamnews} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
