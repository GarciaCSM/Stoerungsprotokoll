import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { homeScreenStyles } from '../styles/HomeScreenStyles';

const HomeScreen = () => {
  return (
    <View style={homeScreenStyles.container}>
      <View style={homeScreenStyles.sidebar}>
        <Text style={homeScreenStyles.sidebarTitle}>Produktionslinien</Text>
        <View style={homeScreenStyles.menu}>
          <Text style={homeScreenStyles.menuItemActive}>Linie 1</Text>
          <Text style={homeScreenStyles.menuItem}>Linie 2</Text>
          <Text style={homeScreenStyles.menuItem}>Linie 3</Text>
          <Text style={homeScreenStyles.menuItem}>Linie 4</Text>
          <Text style={homeScreenStyles.menuItem}>Linie 5</Text>
          <Text style={homeScreenStyles.menuItem}>Linie 6</Text>
        </View>
      </View>
      <ScrollView style={homeScreenStyles.mainContent}>
        <Text style={homeScreenStyles.title}>Linie 1 - Störungsprotokoll</Text>
        <Text style={homeScreenStyles.subtitle}>Produktionslinie 1</Text>
        <View style={homeScreenStyles.card}>
          <Text style={homeScreenStyles.cardTitle}>Aktuelle Störungen</Text>
          <Text>Keine aktiven Störungen auf Linie 1.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;