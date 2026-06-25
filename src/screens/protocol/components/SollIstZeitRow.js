import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import s from '../../../styles/ProtocolScreenStyles';
import { THEME } from '../../../styles/globalStyles';

const TAKT_BRUTTO_OPTIONS = Array.from({ length: 26 }, (_, i) => 10 + i); // 10 to 35

export default function SollIstZeitRow({
  timer,
  selectedFA,
  sollPerHour,
  _soll, _ist, _pauseSec,
  expectedIstRounded, istDiff, istStatus, istColor,
  stoerTotalSeconds,
  istStartTime,
  sollStartTime,
  taktBrutto,
  onSelectTaktBrutto,
  isImportingSoll, isFetchingSoll,
  handleImportSoll, handleRefreshSoll,
  formatTime,
  sensorError,
}) {
  const [showTaktDropdown, setShowTaktDropdown] = useState(false);
  // elapsed represents brutto time. For netto and takt-netto we remove pause and disturbance time.
  const nettoSeconds = Math.max(
    0,
    (timer.elapsed || 0)
      - ((_pauseSec || 0) + (timer.pauseRunning ? timer.pauseElapsed : 0))
      - (stoerTotalSeconds || 0)
  );
  const istHoursDecimal = nettoSeconds > 0 ? nettoSeconds / 3600 : 0;
  const taktNetto = _ist > 0 && istHoursDecimal > 0
    ? (_ist / istHoursDecimal) / 60
    : 0;
  const bruttoValue = useMemo(() => Number(taktBrutto) || 10, [taktBrutto]);

  return (
    <>
    <View style={s.sollIstZeitRow}>

      {/* SOLL + IST column */}
      <View style={s.sollIstColumn}>

        {/* SOLL Card */}
        <View style={[s.sollIstCard, { borderTopWidth: 3, borderTopColor: THEME.colors.dark.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcons name="track-changes" size={13} color={THEME.colors.dark.primary} />
              <Text style={s.sollIstLabel}>SOLL</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity onPress={handleImportSoll} disabled={isImportingSoll} style={{ padding: 5 }}>
                <MaterialIcons name="file-upload" size={16} color={isImportingSoll ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRefreshSoll} disabled={isFetchingSoll} style={{ padding: 5 }}>
                <MaterialIcons name="autorenew" size={16} color={isFetchingSoll ? THEME.colors.dark.foregroundMuted : THEME.colors.dark.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            <Text style={s.sollIstValue}>{_soll > 0 ? expectedIstRounded : '—'}</Text>
            {_soll > 0 && <Text style={{ color: THEME.colors.dark.foregroundMuted, fontSize: 13, marginBottom: 7 }}>Stk</Text>}
          </View>
          <Text style={{ fontSize: 11, color: THEME.colors.dark.foregroundDim, marginTop: 2 }}>
            {_soll > 0 ? `Vorgabe ${sollPerHour} / Std` : 'Kein SOLL geladen'}
          </Text>
        </View>

        {/* IST Card */}
        <View style={[s.sollIstCard, s.sollIstCardSpacing, { borderTopWidth: 3, borderTopColor: istStatus !== 'neutral' ? istColor : THEME.colors.dark.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcons name="bar-chart" size={13} color={istStatus !== 'neutral' ? istColor : THEME.colors.dark.foregroundMuted} />
              <Text style={[s.sollIstLabel, istStatus !== 'neutral' && { color: istColor }]}>IST</Text>
            </View>
            {istStatus !== 'neutral' && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: istColor + '25' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: istColor, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {istStatus === 'good' ? 'Im Soll' : istStatus === 'warning' ? 'Leicht zurück' : 'Zu langsam'}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            <Text style={[s.sollIstValue, { color: istColor }]}>{_ist}</Text>
            <Text style={{ color: istColor + 'AA', fontSize: 13, marginBottom: 7 }}>Stk</Text>
          </View>
          {sensorError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <MaterialIcons name="wifi-off" size={12} color={THEME.colors.dark.danger} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.colors.dark.danger }}>Sensor offline</Text>
            </View>
          )}
          {!sensorError && _soll > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <MaterialIcons
                name={istDiff >= 0 ? 'arrow-upward' : 'arrow-downward'}
                size={13}
                color={istDiff >= 0 ? THEME.colors.dark.success : THEME.colors.dark.danger}
              />
              <Text style={{ fontSize: 12, fontWeight: '700', color: istDiff >= 0 ? THEME.colors.dark.success : THEME.colors.dark.danger }}>
                {istDiff >= 0 ? '+' : ''}{istDiff} Stk
              </Text>
            </View>
          ) : !sensorError ? (
            <Text style={{ fontSize: 11, color: THEME.colors.dark.foregroundDim, marginTop: 2 }}>Kein SOLL geladen</Text>
          ) : null}
        </View>
      </View>

      {/* Zeitübersicht column */}
      <View style={s.zeitColumn}>
        <View style={s.sollIstCard}>
          <Text style={s.sectionTitle}>ZEITÜBERSICHT</Text>

          {/* IST START / SOLL START */}
          <View style={s.zeitStartRow}>
            <View style={s.zeitStartItem}>
              <View style={s.zeitInnerBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="access-time" size={13} color={THEME.colors.dark.info} style={{ marginRight: 4 }} />
                  <Text style={s.zeitPairLabel}>IST START</Text>
                </View>
                <Text style={s.zeitPairValue}>
                  {istStartTime
                    ? new Date(istStartTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </Text>
              </View>
            </View>
            <View style={s.zeitStartItem}>
              <View style={s.zeitInnerBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="access-time" size={13} color={THEME.colors.dark.success} style={{ marginRight: 4 }} />
                  <Text style={s.zeitPairLabel}>SOLL START</Text>
                </View>
                <Text style={s.zeitPairValue}>
                  {sollStartTime
                    ? new Date(sollStartTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </Text>
              </View>
            </View>
          </View>

          {/* TAKT NETTO / TAKT BRUTTO */}
          <View style={s.zeitPairRow}>
            <View style={s.zeitPairItem}>
              <View style={s.zeitInnerBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="speed" size={13} color={THEME.colors.dark.success} style={{ marginRight: 4 }} />
                  <Text style={[s.zeitPairLabel, { color: THEME.colors.dark.success }]}>TAKT NETTO</Text>
                </View>
                <Text style={[s.zeitPairValue, { color: THEME.colors.dark.success }]}>
                  {taktNetto > 0 ? `${taktNetto.toFixed(2)} Stk/min` : '--'}
                </Text>
              </View>
            </View>
            <View style={s.zeitPairItem}>
              <View style={s.zeitInnerBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="tune" size={13} color={THEME.colors.dark.info} style={{ marginRight: 4 }} />
                  <Text style={[s.zeitPairLabel, { color: THEME.colors.dark.info }]}>TAKT BRUTTO</Text>
                </View>
                <TouchableOpacity style={s.taktValueRow} activeOpacity={0.75} onPress={() => setShowTaktDropdown(true)}>
                  <Text style={s.taktValue}>{String(bruttoValue)}</Text>
                  <Text style={s.taktInputUnit}>Stk/min</Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={THEME.colors.dark.info} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* BRUTTO / NETTO */}
          <View style={s.zeitPairRow}>
            <View style={s.zeitPairItem}>
              <View style={s.zeitInnerBox}>
                <Text style={s.zeitPairLabel}>BRUTTO</Text>
                <Text style={s.zeitPairValue}>{formatTime(timer.bruttoWallClock || 0)}</Text>
              </View>
            </View>
            <View style={s.zeitPairItem}>
              <View style={s.zeitInnerBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="show-chart" size={13} color={THEME.colors.dark.success} style={{ marginRight: 4 }} />
                  <Text style={[s.zeitPairLabel, { color: THEME.colors.dark.success }]}>NETTO</Text>
                </View>
                <Text style={[s.zeitPairValue, { color: THEME.colors.dark.success }]}>
                  {selectedFA
                    ? formatTime(Math.max(0,
                        timer.elapsed
                        - (_pauseSec + (timer.pauseRunning ? timer.pauseElapsed : 0))
                        - stoerTotalSeconds  // subtract both pauses and störung time for netto
                      ))
                    : '--:--'}
                </Text>
              </View>
            </View>
          </View>

          {/* STÖRUNG KUM / PAUSE KUM */}
          <View style={s.zeitPairRow}>
            <View style={s.zeitPairItem}>
              <View style={s.zeitInnerBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="warning" size={13} color={THEME.colors.dark.danger} style={{ marginRight: 4 }} />
                  <Text style={[s.zeitPairLabel, { color: THEME.colors.dark.danger }]}>STÖRUNG KUM.</Text>
                </View>
                <Text style={[s.zeitPairValue, { color: THEME.colors.dark.danger }]}>
                  {Math.floor(stoerTotalSeconds / 60)} Min
                </Text>
              </View>
            </View>
            <View style={s.zeitPairItem}>
              <View style={s.zeitInnerBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="free-breakfast" size={13} color={THEME.colors.dark.warning} style={{ marginRight: 4 }} />
                  <Text style={[s.zeitPairLabel, { color: THEME.colors.dark.warning }]}>PAUSE KUM.</Text>
                </View>
                <Text style={[s.zeitPairValue, { color: THEME.colors.dark.warning }]}>
                  {Math.floor((_pauseSec + (timer.pauseRunning ? timer.pauseElapsed : 0)) / 60)} Min
                </Text>
              </View>
            </View>
          </View>

        </View>
      </View>
    </View>
    <Modal
      visible={showTaktDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowTaktDropdown(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={s.dropdownBackdrop}
        onPress={() => setShowTaktDropdown(false)}
      >
        <View style={s.dropdownCard}>
          <Text style={s.dropdownTitle}>TAKT BRUTTO</Text>
          <ScrollView style={s.dropdownList}>
            {TAKT_BRUTTO_OPTIONS.map((value) => {
              const selected = value === bruttoValue;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.dropdownItem, selected && s.dropdownItemSelected]}
                  onPress={() => {
                    onSelectTaktBrutto(value);
                    setShowTaktDropdown(false);
                  }}
                >
                  <Text style={[s.dropdownItemText, selected && s.dropdownItemTextSelected]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
    </>
  );
}
