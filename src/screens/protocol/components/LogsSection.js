import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { toIsoUtcOrNow } from '../../../utils/dateSafe';
import { MaterialIcons } from '@expo/vector-icons';
import s from '../../../styles/ProtocolScreenStyles';
import { THEME } from '../../../styles/globalStyles';

export default function LogsSection({
  localLogs,
  viewMode, setViewMode,
  clearAllLocalLogs,
  setLocalLogsFromServer,
  dbSync,
  computeIssueSummary,
  showConfirm,
  formatTime,
}) {
  const handleClear = () =>
    showConfirm({
      title: 'Protokoll leeren',
      message: 'Einträge werden nur lokal gelöscht. Die Daten bleiben in der Datenbank und werden beim nächsten Laden wiederhergestellt. Trotzdem leeren?',
      onConfirm: async () => {
        await clearAllLocalLogs();
        try {
          const { stoerungen } = await dbSync.loadFromDb();
          if (Array.isArray(stoerungen) && stoerungen.length) {
            setLocalLogsFromServer(stoerungen.map(s => ({
              id: s.id || Date.now(),
              type: 'störung',
              line: s.linie,
              lineNumber: s.linie_nummer || (s.linie?.match(/\d+/)?.[0] || s.linie),
              shift: s.schicht,
              shift_type: s.schicht,
              leader: s.linienfuehrer || null,
              issue: s.stoerung_typ,
              notes: s.notiz || null,
              startTime: toIsoUtcOrNow(s.start_time),
              endTime: toIsoUtcOrNow(s.end_time),
              durationSeconds: Number(s.dauer_sekunden || 0),
              createdAt: toIsoUtcOrNow(s.erstellt_am),
            })));
          }
        } catch (e) { console.warn('DB reload after clear failed', e); }
      },
    });

  return (
    <View style={s.logsSection}>
      <View style={s.tableTitleRow}>
        <Text style={s.sectionTitle}>STÖRUNGSPROTOKOLLE (HEUTE)</Text>
        <TouchableOpacity onPress={handleClear}>
          <MaterialIcons name="delete-outline" size={24} color={THEME.colors.dark.danger} />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {['logs', 'summary'].map(mode => (
          <TouchableOpacity
            key={mode}
            onPress={() => setViewMode(mode)}
            style={[s.tabButton, viewMode === mode && s.tabActive]}
          >
            <Text style={[s.tabText, viewMode === mode && s.tabTextActive]}>
              {mode === 'logs' ? 'Protokolle' : `Übersicht (${localLogs.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.tableContainer}>
        {viewMode === 'logs' ? (
          <>
            <View style={s.tableHeader}>
              <View style={{ width: 8 }} />
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>STÖRUNG</Text>
              <Text style={s.tableHeaderCell}>START</Text>
              <Text style={s.tableHeaderCell}>ENDE</Text>
              <Text style={s.tableHeaderCell}>DAUER</Text>
            </View>
            {localLogs.length === 0 ? (
              <Text style={s.tableEmpty}>Keine Einträge für heute</Text>
            ) : (
              <ScrollView style={s.tableScroll} nestedScrollEnabled>
                {localLogs.map((log) => {
                  const dur = log.durationSeconds;
                  const col = dur >= 60 ? THEME.colors.dark.danger : dur >= 10 ? THEME.colors.dark.warning : THEME.colors.dark.netto;
                  const fmtHm = (t) => {
                    const d = new Date(t);
                    return Number.isFinite(d.getTime())
                      ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                      : '—';
                  };
                  return (
                    <View key={log.id} style={[s.tableRow, { flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col, marginRight: 12 }} />
                      <View style={{ flex: 2 }}>
                        <Text style={s.tableCell}>{log.issue}</Text>
                        {log.notes && <Text style={s.tableNote}>{log.notes}</Text>}
                      </View>
                      <Text style={s.tableCell}>{fmtHm(log.startTime)}</Text>
                      <Text style={s.tableCell}>{fmtHm(log.endTime)}</Text>
                      <Text style={[s.tableCell, { color: col, fontWeight: '600' }]}>{formatTime(dur)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </>
        ) : (
          computeIssueSummary().length === 0 ? (
            <Text style={s.tableEmpty}>Keine definierten Störungen</Text>
          ) : (
            <View style={s.summaryGrid}>
              {computeIssueSummary().map(item => (
                <View key={item.label} style={s.summaryCard}>
                  <Text style={s.summaryCount}>{item.count}</Text>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                  <Text style={s.summaryTime}>{formatTime(item.totalSeconds)}</Text>
                </View>
              ))}
            </View>
          )
        )}
      </View>
    </View>
  );
}
