import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import s from '../../../styles/ProtocolScreenStyles';
import { THEME } from '../../../styles/globalStyles';

export default function FaSection({
  faSearchText, setFaSearchText,
  faSearchError,
  faSearchResults,
  isSearching,
  selectedFA,
  handleFASearch,
  handleSelectFA,
  onRemoveFA,
  showConfirm,
}) {
  return (
    <View style={s.faSectionCard}>
      <Text style={s.sectionTitle}>FERTIGUNGSAUFTRAG</Text>

      {!selectedFA ? (
        <>
          <View style={s.faSearchContainer}>
            <TextInput
              style={s.faSearchInput}
              placeholder="FA-Nummer eingeben"
              placeholderTextColor={THEME.colors.dark.foregroundDim}
              value={faSearchText}
              onChangeText={setFaSearchText}
              autoCapitalize="characters"
              onSubmitEditing={handleFASearch}
            />
            <TouchableOpacity style={s.faSearchButton} onPress={handleFASearch} disabled={isSearching}>
              <MaterialIcons name="search" size={20} color={THEME.colors.dark.foreground} />
            </TouchableOpacity>
          </View>

          {!!faSearchError && <Text style={s.faSearchError}>{faSearchError}</Text>}

          {faSearchResults.length > 0 && (
            <View style={s.faResultsContainer}>
              <Text style={s.faResultsTitle}>Suchergebnisse ({faSearchResults.length})</Text>
              <ScrollView style={s.faResultsList} nestedScrollEnabled>
                {faSearchResults.map((fa, i) => (
                  <TouchableOpacity key={i} style={s.faResultItem} onPress={() => handleSelectFA(fa)}>
                    <Text style={s.faResultFANr}>{fa.FANr}</Text>
                    <Text style={s.faResultArtikel}>{fa.Artikelbezeichnung}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      ) : (
        <View style={s.faSelectedContainer}>
          <View style={s.faSelectedContent}>
            <Text style={s.faSelectedLabel}>FA-Nummer</Text>
            <Text style={s.faSelectedValue}>{selectedFA.FANr}</Text>
            <Text style={[s.faSelectedLabel, { marginTop: 8 }]}>Artikel-Nr</Text>
            <Text style={s.faSelectedValue}>{selectedFA.ArtikelNr}</Text>
            <Text style={[s.faSelectedLabel, { marginTop: 8 }]}>Bezeichnung</Text>
            <Text style={s.faSelectedValue}>{selectedFA.Artikelbezeichnung}</Text>
          </View>
          <TouchableOpacity
            style={s.faRemoveButton}
            onPress={() =>
              showConfirm({
                title: 'FA entfernen',
                message: 'Fertigungsauftrag wirklich entfernen?',
                onConfirm: onRemoveFA,
              })
            }
          >
            <MaterialIcons name="close" size={20} color={THEME.colors.dark.danger} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
