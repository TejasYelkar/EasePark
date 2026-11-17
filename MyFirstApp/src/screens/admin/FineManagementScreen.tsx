
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  TextInput,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  fetchAdminBookings,
  type AdminBooking,
} from '@/services/parking-bookings';

type IconName = keyof typeof Ionicons.glyphMap;

const COLORS = {
  navy: '#082D68',
  yellow: '#F5C400',
  green: '#16A765',
  red: '#EF4444',
  orange: '#F59E0B',
  background: '#F5F7FC',
  white: '#FFFFFF',
  black: '#000000',
  text: '#101828',
  muted: '#64748B',
  border: '#E8EDF5',
};

type FineRecord = {
  id: string;
  vehicle: string;
  expiry: string;
  extraTime: string;
  amount: number;
  status: 'Pending' | 'Paid';
  date: string;
};

const metrics: {
  title: string;
  icon: IconName;
  color: string;
  background: string;
}[] = [
  {
    title: 'Total Fine Amount',
    icon: 'receipt-outline',
    color: COLORS.yellow,
    background: '#FFF7D6',
  },
  {
    title: 'Active Overstays',
    icon: 'time-outline',
    color: COLORS.orange,
    background: '#FFF0DB',
  },
  {
    title: 'Pending Amount',
    icon: 'wallet-outline',
    color: COLORS.red,
    background: '#FFE4E4',
  },
  {
    title: 'Collected Amount',
    icon: 'checkmark-circle-outline',
    color: COLORS.green,
    background: '#DDF5E9',
  },
];

function MetricCard({
  item,
  value,
}: {
  item: (typeof metrics)[number];
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View
        style={[
          styles.metricIcon,
          { backgroundColor: item.background },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={27}
          color={item.color}
        />
      </View>

      <View style={styles.metricInfo}>
        <Text style={styles.metricValue}>
          {value}
        </Text>

        <Text style={styles.metricTitle}>
          {item.title}
        </Text>
      </View>
    </View>
  );
}

function ActiveVehicleCard({
  item,
}: {
  item: {
    id: string;
    vehicle: string;
    expiry: string;
    extraTime: string;
    amount: number;
  };
}) {
  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleTop}>
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleIcon}>
            <Ionicons
              name="bicycle-outline"
              size={25}
              color={COLORS.navy}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleNumber}>
              {item.vehicle}
            </Text>

            <Text style={styles.vehicleSub}>
              Parking overstay
            </Text>
          </View>
        </View>

        <View style={styles.overstayBadge}>
          <Text style={styles.overstayText}>
            Overstay
          </Text>
        </View>
      </View>

      <View style={styles.vehicleDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>
            Parking expired
          </Text>

          <Text style={styles.detailValue}>
            {item.expiry}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>
            Extra time
          </Text>

          <Text style={styles.detailValue}>
            {item.extraTime}
          </Text>
        </View>
      </View>

      <View style={styles.fineAmountRow}>
        <View>
          <Text style={styles.detailLabel}>
            Overdue by
          </Text>

          <Text style={styles.detailValue}>
            {item.extraTime}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.detailLabel}>
            Fine status
          </Text>

          <Text style={styles.fineAmount}>
            ₹{item.amount.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.pendingRow}>
        <Ionicons
          name="time-outline"
          size={16}
          color={COLORS.orange}
        />

        <Text style={styles.pendingText}>
          Parking has exceeded its exit time
        </Text>
      </View>
    </View>
  );
}

export default function FineManagementScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'All' | 'Pending' | 'Paid'
  >('All');
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const loadBookings = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      setBookings(await fetchAdminBookings());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load fines.');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => void loadBookings(), 0);
    const interval = setInterval(() => void loadBookings(), 15000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadBookings]);

  useEffect(() => {
    const initialTick = setTimeout(() => setCurrentTime(new Date().getTime()), 0);
    const interval = setInterval(() => setCurrentTime(new Date().getTime()), 60_000);
    return () => {
      clearTimeout(initialTick);
      clearInterval(interval);
    };
  }, []);

  const fineHistory = useMemo<FineRecord[]>(() => bookings
    .filter(booking => booking.fineAmount > 0)
    .map(booking => {
      const actualExit = booking.checkedOutAt
        ? new Date(booking.checkedOutAt)
        : new Date(currentTime ?? new Date(`${booking.parkingDate}T${booking.exitTime}`).getTime());
      const scheduledExit = new Date(`${booking.parkingDate}T${booking.exitTime}`);
      const overdueMinutes = Math.max(
        0,
        Math.floor((actualExit.getTime() - scheduledExit.getTime()) / 60_000)
      );
      const hours = Math.floor(overdueMinutes / 60);
      const minutes = overdueMinutes % 60;
      return {
        id: booking.id,
        vehicle: booking.vehicleNumber,
        expiry: booking.exitTime,
        extraTime: hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`,
        amount: booking.fineAmount,
        status: booking.paymentStatus === 'PAID' ? 'Paid' : 'Pending',
        date: new Date(`${booking.parkingDate}T00:00:00`).toLocaleDateString('en-IN'),
      };
    }), [bookings, currentTime]);

  const activeVehicles = useMemo(() => {
    if (currentTime === null) {
      return [];
    }
    return bookings
      .filter(booking =>
        booking.bookingStatus === 'APPROVED' &&
        booking.checkedOutAt === null &&
        new Date(`${booking.parkingDate}T${booking.exitTime}`).getTime() < currentTime
      )
      .map(booking => {
        const scheduledExit = new Date(`${booking.parkingDate}T${booking.exitTime}`);
        const overdueMinutes = Math.floor((currentTime - scheduledExit.getTime()) / 60_000);
        const hours = Math.floor(overdueMinutes / 60);
        const minutes = overdueMinutes % 60;
        return {
          id: booking.id,
          vehicle: booking.vehicleNumber,
          expiry: booking.exitTime,
          amount: booking.fineAmount,
          extraTime: hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`,
        };
      });
  }, [bookings, currentTime]);

  const filteredVehicles = useMemo(() => activeVehicles.filter(item =>
    item.vehicle.toLowerCase().includes(search.toLowerCase())
  ), [activeVehicles, search]);

  const filteredHistory = useMemo(() => {
    return fineHistory.filter((item) => {
      const matchesSearch = item.vehicle
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === 'All' || item.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [fineHistory, search, filter]);

  const totalFine = bookings.reduce((total, booking) => total + booking.fineAmount, 0);
  const pendingAmount = bookings
    .filter(booking => booking.paymentStatus !== 'PAID')
    .reduce((total, booking) => total + booking.fineAmount, 0);
  const collectedAmount = bookings
    .filter(booking => booking.paymentStatus === 'PAID')
    .reduce((total, booking) => total + booking.fineAmount, 0);

  const metricValues: Record<string, string> = {
    'Total Fine Amount': `₹${totalFine.toLocaleString('en-IN')}`,
    'Active Overstays': String(activeVehicles.length),
    'Pending Amount': `₹${pendingAmount.toLocaleString('en-IN')}`,
    'Collected Amount': `₹${collectedAmount.toLocaleString('en-IN')}`,
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SMARTPARK HEADER */}

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons
                name="car-sport-outline"
                size={34}
                color={COLORS.black}
              />

              <Text style={styles.logoP}>P</Text>
            </View>

            <View style={styles.brandDivider} />

            <View>
              <Text style={styles.brandName}>
                SmartPark
              </Text>

              <Text style={styles.brandSubtitle}>
                Admin Dashboard
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.headerIcon}>
              <Ionicons
                name="notifications-outline"
                size={25}
                color={COLORS.black}
              />

            </Pressable>

            <Pressable style={styles.profileIcon}>
              <Ionicons
                name="person-outline"
                size={25}
                color={COLORS.black}
              />
            </Pressable>
          </View>
        </View>

        {/* MAIN CONTENT */}

        <View style={styles.content}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={COLORS.navy}
            />

            <Text style={styles.backText}>
              Back
            </Text>
          </Pressable>

          <View style={styles.pageTitleRow}>
            <Text style={styles.heading}>Fine Management</Text>
            <Pressable
              style={styles.refreshButton}
              onPress={() => void loadBookings(true)}
              disabled={refreshing}
              accessibilityRole="button"
              accessibilityLabel="Refresh fine amounts"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={COLORS.navy} />
              ) : (
                <Ionicons name="refresh-outline" size={17} color={COLORS.navy} />
              )}
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing' : 'Refresh'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.welcome}>
            Parking Overstay Monitoring
          </Text>

          {/* SUMMARY CARDS */}

          <View style={styles.metricsGrid}>
            {metrics.map((item) => (
              <MetricCard
                key={item.title}
                item={item}
                value={loading ? '…' : loadError ? '—' : metricValues[item.title]}
              />
            ))}
          </View>
          {loadError && (
            <Pressable
              style={styles.emptyCard}
              onPress={() => void loadBookings()}
              accessibilityRole="button"
            >
              <Text style={styles.emptyText}>Could not load fine totals. Tap to retry.</Text>
            </Pressable>
          )}

          {/* ACTIVE OVERSTAYS */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Active Overstay Vehicles
            </Text>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {loading ? '… Active' : loadError ? '— Active' : `${activeVehicles.length} Active`}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionSubtitle}>
            Vehicles remaining after parking expiry
          </Text>

          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((item) => (
              <ActiveVehicleCard
                key={item.id}
                item={item}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                name="search-outline"
                size={35}
                color={COLORS.muted}
              />

              <Text style={styles.emptyText}>
                {loading ? 'Loading overstay records…' : 'No active overstay vehicles'}
              </Text>
            </View>
          )}

          {/* FINE HISTORY */}

          <Text style={styles.sectionTitle}>
            Fine History
          </Text>

          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={21}
              color={COLORS.muted}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search vehicle number..."
              placeholderTextColor={COLORS.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="characters"
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.muted}
                />
              </Pressable>
            )}
          </View>

          {/* FILTER BUTTONS */}

          <View style={styles.filterRow}>
            {(['All', 'Pending', 'Paid'] as const).map(
              (item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.filterButton,
                    filter === item &&
                      styles.activeFilterButton,
                  ]}
                  onPress={() => setFilter(item)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item &&
                        styles.activeFilterText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* HISTORY RECORDS */}

          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <View
                key={item.id}
                style={styles.historyCard}
              >
                <View style={styles.historyTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyVehicle}>
                      {item.vehicle}
                    </Text>

                    <Text style={styles.historyDate}>
                      {item.date} • {item.id}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'Paid'
                        ? styles.paidBadge
                        : styles.unpaidBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.status === 'Paid'
                          ? styles.paidText
                          : styles.unpaidText,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyBottom}>
                  <View>
                    <Text style={styles.detailLabel}>
                      Extra parking time
                    </Text>

                    <Text style={styles.detailValue}>
                      {item.extraTime}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.detailLabel}>
                      Fine amount
                    </Text>

                    <Text style={styles.historyAmount}>
                      ₹{item.amount}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {loading ? 'Loading fine records…' : 'No fine records found'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          SmartPark Admin Panel
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 25,
  },

  header: {
    backgroundColor: COLORS.yellow,
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  logo: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoP: {
    position: 'absolute',
    right: -2,
    bottom: -4,
    color: COLORS.yellow,
    backgroundColor: COLORS.black,
    fontWeight: '900',
    fontSize: 12,
    borderRadius: 15,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  brandDivider: {
    height: 48,
    width: 2,
    backgroundColor: COLORS.black,
    opacity: 0.8,
  },

  brandName: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.black,
  },

  brandSubtitle: {
    color: COLORS.black,
    fontSize: 14,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  headerIcon: {
    padding: 7,
  },

  notificationDot: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: COLORS.black,
    width: 17,
    height: 17,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationText: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: 'bold',
  },

  profileIcon: {
    width: 42,
    height: 42,
    borderRadius: 25,
    backgroundColor: '#E5B600',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 17,
    paddingTop: 20,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 17,
    alignSelf: 'flex-start',
  },

  backText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '600',
  },

  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.text,
  },

  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  refreshButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  refreshButtonText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '700',
  },

  welcome: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
    marginBottom: 20,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  metricCard: {
    width: '48.5%',
    minHeight: 105,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricInfo: {
    flex: 1,
  },

  metricValue: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },

  metricTitle: {
    color: COLORS.text,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  policyCard: {
    marginTop: 16,
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 16,
    elevation: 2,
  },

  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 15,
  },

  policyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  policyDetails: {
    gap: 12,
  },

  policyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  policyLabel: {
    color: '#D7DFED',
    fontSize: 13,
  },

  policyValue: {
    color: COLORS.yellow,
    fontSize: 14,
    fontWeight: '800',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 25,
    marginBottom: 7,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 13,
  },

  countBadge: {
    backgroundColor: '#FFF0DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },

  countText: {
    color: '#B76A00',
    fontSize: 11,
    fontWeight: '700',
  },

  vehicleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 13,
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  vehicleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  vehicleIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  vehicleNumber: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },

  vehicleSub: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  overstayBadge: {
    backgroundColor: '#FFE4E4',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },

  overstayText: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '700',
  },

  vehicleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  detailItem: {
    gap: 5,
  },

  detailLabel: {
    color: COLORS.muted,
    fontSize: 11,
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },

  fineAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
  },

  fineAmount: {
    color: COLORS.red,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 3,
  },

  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#FFF7E8',
    padding: 9,
    borderRadius: 10,
  },

  pendingText: {
    color: '#B76A00',
    fontSize: 11,
    fontWeight: '700',
  },

  searchBox: {
    minHeight: 49,
    backgroundColor: COLORS.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
    marginBottom: 14,
  },

  filterButton: {
    paddingHorizontal: 19,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  activeFilterButton: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },

  filterText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },

  activeFilterText: {
    color: COLORS.black,
    fontWeight: '800',
  },

  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },

  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  historyVehicle: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '800',
  },

  historyDate: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  paidBadge: {
    backgroundColor: '#DDF5E9',
  },

  unpaidBadge: {
    backgroundColor: '#FFF0DB',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  paidText: {
    color: COLORS.green,
  },

  unpaidText: {
    color: '#B76A00',
  },

  historyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  historyAmount: {
    color: COLORS.red,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 9,
  },

  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 25,
    marginBottom: 10,
  },
});
