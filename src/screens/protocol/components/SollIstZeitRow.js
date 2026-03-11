import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import s from '../../../styles/ProtocolScreenStyles';
import { THEME } from '../../../styles/globalStyles';

export default function SollIstZeitRow({
  timer,
  selectedFA,
  sollPerHour,
  _soll, _ist, _pauseSec,
  expectedIstRounded, istDiff, istStatus, istColor,
  stoerTotalSeconds,
  isImportingSoll, isFetchingSoll,
  handleImportSoll, handleRefreshSoll,
  formatTime,
}) {
  return (
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
          {_soll > 0 ? (
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
          ) : (
            <Text style={{ fontSize: 11, color: THEME.colors.dark.foregroundDim, marginTop: 2 }}>Kein SOLL geladen</Text>
          )}
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
                  {timer.mainTimerStartTime.current
                    ? new Date(timer.mainTimerStartTime.current).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
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
                <Text style={s.zeitPairValue}>--:--</Text>
              </View>
            </View>
          </View>

          {/* BRUTTO / NETTO */}
          <View style={s.zeitPairRow}>
            <View style={s.zeitPairItem}>
              <View style={s.zeitInnerBox}>
                <Text style={s.zeitPairLabel}>BRUTTO</Text>
                <Text style={s.zeitPairValue}>{formatTime(timer.elapsed)}</Text>
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
  );
}
