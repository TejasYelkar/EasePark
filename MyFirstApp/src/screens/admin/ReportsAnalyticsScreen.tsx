import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AdminExportPanel from './AdminExportPanel';

const COLORS = {
  navy: '#082D68',
  yellow: '#F5C400',
  black: '#000000',
  muted: '#64748B',
  background: '#F5F7FC',
  white: '#FFFFFF',
};

export default function ReportsAnalyticsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to admin dashboard"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </Pressable>
          <View>
            <Text style={styles.title}>Reports & Analytics</Text>
            <Text style={styles.subtitle}>Export parking and finance data</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.infoCard}>
            <Ionicons name="bar-chart-outline" size={27} color={COLORS.navy} />
            <Text style={styles.infoText}>
              Tick the sections you want in your workbook. The selected date
              range filters booking, payment and fine records.
            </Text>
          </View>
          <AdminExportPanel mode="reports" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 28,
  },
  header: {
    minHeight: 116,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#E5B600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.black,
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.black,
    fontSize: 13,
    marginTop: 3,
  },
  body: {
    padding: 18,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
