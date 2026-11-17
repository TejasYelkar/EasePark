
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
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  fetchAdminBookings,
  type AdminBooking,
} from '@/services/parking-bookings';
import AdminExportPanel from './AdminExportPanel';

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

type PaymentStatus = 'Successful' | 'Pending';

type Payment = {
  id: string;
  vehicle: string;
  amount: number;
  method: string;
  date: string;
  time: string;
  status: PaymentStatus;
};

const filters = [
  'All',
  'Successful',
  'Pending',
] as const;

type FilterType = (typeof filters)[number];

function getStatusColor(status: PaymentStatus) {
  switch (status) {
    case 'Successful':
      return COLORS.green;
    case 'Pending':
      return COLORS.orange;
    default:
      return COLORS.muted;
  }
}

function getStatusIcon(status: PaymentStatus): IconName {
  switch (status) {
    case 'Successful':
      return 'checkmark-circle';
    case 'Pending':
      return 'time';
    default:
      return 'help-circle';
  }
}

function formatDate(date: string | null, fallback: string) {
  if (!date) {
    return new Date(`${fallback}T00:00:00`).toLocaleDateString('en-IN');
  }
  return new Date(date).toLocaleDateString('en-IN');
}

function mapPayment(booking: AdminBooking): Payment {
  const paidAt = booking.paidAt;
  return {
    id: booking.id,
    vehicle: booking.vehicleNumber,
    amount: booking.paymentAmount ?? booking.estimatedPrice + booking.fineAmount,
    method: booking.paymentMethod ?? 'Unpaid',
    date: formatDate(paidAt, booking.parkingDate),
    time: paidAt
      ? new Date(paidAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : booking.exitTime,
    status: booking.paymentStatus === 'PAID' ? 'Successful' : 'Pending',
  };
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  background,
}: {
  title: string;
  value: string;
  icon: IconName;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={25} color={color} />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  );
}

function PaymentCard({
  payment,
  onPress,
}: {
  payment: Payment;
  onPress: () => void;
}) {
  const statusColor = getStatusColor(payment.status);

  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentTop}>
        <View>
          <Text style={styles.transactionLabel}>
            BOOKING ID
          </Text>
          <Text style={styles.paymentId}>
            {payment.id}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '18' },
          ]}
        >
          <Ionicons
            name={getStatusIcon(payment.status)}
            size={14}
            color={statusColor}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {payment.status}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Amount</Text>
        <Text style={styles.amountValue}>
          ₹{payment.amount.toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.paymentDivider} />

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Ionicons name="car-outline" size={17} color={COLORS.muted} />
          <Text style={styles.detailText}>{payment.vehicle}</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.smallDetail}>
          <Ionicons name="card-outline" size={16} color={COLORS.muted} />
          <Text style={styles.smallDetailText}>{payment.method}</Text>
        </View>

        <View style={styles.smallDetail}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
          <Text style={styles.smallDetailText}>{payment.date}</Text>
        </View>
      </View>

      <View style={styles.paymentBottom}>
        <Text style={styles.paymentTime}>
          <Ionicons name="time-outline" size={13} color={COLORS.muted} />
          {' '}{payment.time}
        </Text>

        <Pressable
          style={styles.viewButton}
          onPress={onPress}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.navy} />
        </Pressable>
      </View>
    </View>
  );
}

export default function PaymentsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBookings = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      setBookings(await fetchAdminBookings());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load payments.');
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

  const payments = useMemo(
    () => bookings
      .filter(booking =>
        booking.paymentStatus === 'PAID' || booking.bookingStatus === 'COMPLETED'
      )
      .map(mapPayment),
    [bookings]
  );

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesFilter =
        activeFilter === 'All' || payment.status === activeFilter;

      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        payment.vehicle.toLowerCase().includes(searchText) ||
        payment.id.toLowerCase().includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, payments, search]);

  const successfulCount = payments.filter(
    (p) => p.status === 'Successful'
  ).length;

  const pendingCount = payments.filter(
    (p) => p.status === 'Pending'
  ).length;

  const collectedFines = bookings
    .filter(booking => booking.paymentStatus === 'PAID')
    .reduce((total, booking) => total + booking.fineAmount, 0);

  const totalCollections = payments
    .filter((p) => p.status === 'Successful')
    .reduce((total, p) => total + p.amount, 0);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER - SAME DESIGN AS DASHBOARD */}

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
              <Text style={styles.brandName}>SmartPark</Text>
              <Text style={styles.brandSubtitle}>
                Admin Dashboard
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIcon}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to admin dashboard"
            >
              <Ionicons name="arrow-back" size={25} color={COLORS.black} />
            </Pressable>

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
          <Text style={styles.heading}>Payments</Text>

          <Text style={styles.welcome}>
            Manage and track parking transactions
          </Text>

          {/* SUMMARY */}

          <View style={styles.overviewHeader}>
            <Text style={[styles.sectionTitle, styles.overviewTitle]}>
              Payment Overview
            </Text>
            <Pressable
              style={styles.refreshButton}
              onPress={() => void loadBookings(true)}
              disabled={refreshing}
              accessibilityRole="button"
              accessibilityLabel="Refresh payment totals"
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

          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Total Collections"
              value={loading
                ? '…'
                : loadError
                  ? '—'
                  : `₹${totalCollections.toLocaleString('en-IN')}`}
              icon="wallet-outline"
              color={COLORS.navy}
              background="#E8EEFF"
            />

            <SummaryCard
              title="Paid Bookings"
              value={loading ? '…' : loadError ? '—' : String(successfulCount)}
              icon="checkmark-circle-outline"
              color={COLORS.green}
              background="#DDF5E9"
            />

            <SummaryCard
              title="Completed Unpaid"
              value={loading ? '…' : loadError ? '—' : String(pendingCount)}
              icon="time-outline"
              color={COLORS.orange}
              background="#FFF0DB"
            />

            <SummaryCard
              title="Fines Collected"
              value={loading
                ? '…'
                : loadError
                  ? '—'
                  : `₹${collectedFines.toLocaleString('en-IN')}`}
              icon="checkmark-circle-outline"
              color={COLORS.green}
              background="#DDF5E9"
            />
          </View>

          <AdminExportPanel mode="payments" />

          {/* PAYMENT HISTORY */}

          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>
              Payment History
            </Text>

            <Text style={styles.recordCount}>
              {filteredPayments.length} Records
            </Text>
          </View>

          {/* SEARCH */}

          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={21}
              color={COLORS.muted}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search vehicle or booking ID..."
              placeholderTextColor="#94A3B8"
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

          {/* FILTERS */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {filters.map((filter) => {
              const selected = activeFilter === filter;

              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterButton,
                    selected && styles.activeFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.activeFilterText,
                    ]}
                  >
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* TRANSACTION LIST */}

          {loadError && (
            <Pressable
              style={styles.emptyState}
              onPress={() => void loadBookings()}
              accessibilityRole="button"
            >
              <Text style={styles.emptyTitle}>Could Not Load Payments</Text>
              <Text style={styles.emptySubtitle}>{loadError}. Tap to retry.</Text>
            </Pressable>
          )}

          {!loadError && filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onPress={() => setSelectedPayment(payment)}
              />
            ))
          ) : !loadError ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color="#AAB4C3"
              />

              <Text style={styles.emptyTitle}>
                {loading ? 'Loading Payments…' : 'No Payments Found'}
              </Text>

              <Text style={styles.emptySubtitle}>
                {loading ? 'Loading saved payment records.' : 'Try changing your search or filter.'}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          SmartPark Admin Panel
        </Text>
      </ScrollView>

      {/* PAYMENT DETAILS MODAL */}

      <Modal
        visible={selectedPayment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPayment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPayment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Payment Details
                  </Text>

                  <Pressable
                    onPress={() => setSelectedPayment(null)}
                    style={styles.closeButton}
                  >
                    <Ionicons
                      name="close"
                      size={23}
                      color={COLORS.text}
                    />
                  </Pressable>
                </View>

                <View style={styles.modalAmountBox}>
                  <Ionicons
                    name="wallet-outline"
                    size={32}
                    color={COLORS.navy}
                  />

                  <Text style={styles.modalAmount}>
                    ₹{selectedPayment.amount.toLocaleString('en-IN')}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(selectedPayment.status) + '18',
                      },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(selectedPayment.status)}
                      size={15}
                      color={getStatusColor(selectedPayment.status)}
                    />

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: getStatusColor(selectedPayment.status),
                        },
                      ]}
                    >
                      {selectedPayment.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDetails}>
                  <Text style={styles.modalSectionTitle}>
                    Transaction Information
                  </Text>

                  {[
                    ['Booking ID', selectedPayment.id],
                    ['Vehicle Number', selectedPayment.vehicle],
                    ['Payment Method', selectedPayment.method],
                    ['Date', selectedPayment.date],
                    ['Time', selectedPayment.time],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.modalDetailRow}>
                      <Text style={styles.modalLabel}>{label}</Text>
                      <Text style={styles.modalValue}>{value}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={styles.doneButton}
                  onPress={() => setSelectedPayment(null)}
                >
                  <Text style={styles.doneButtonText}>Close Details</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
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

  // HEADER

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

  // CONTENT

  content: {
    paddingHorizontal: 17,
    paddingTop: 25,
  },

  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.text,
  },

  welcome: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },

  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  overviewTitle: {
    marginBottom: 0,
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

  // SUMMARY CARDS

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  summaryCard: {
    width: '48.5%',
    minHeight: 132,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },

  summaryTitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  // HISTORY

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
  },

  recordCount: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 14,
  },

  searchBox: {
    minHeight: 52,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 10,
  },

  filterContainer: {
    gap: 9,
    paddingBottom: 17,
  },

  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  activeFilter: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },

  activeFilterText: {
    color: COLORS.white,
  },

  // PAYMENT CARDS

  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
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

  paymentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  transactionLabel: {
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.8,
  },

  paymentId: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 3,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 17,
    marginBottom: 12,
  },

  amountLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },

  amountValue: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.navy,
  },

  paymentDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 13,
  },

  detailRow: {
    marginBottom: 12,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  detailText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },

  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 10,
  },

  smallDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  smallDetailText: {
    fontSize: 11,
    color: COLORS.muted,
  },

  paymentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  paymentTime: {
    fontSize: 11,
    color: COLORS.muted,
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  viewButtonText: {
    fontSize: 12,
    color: COLORS.navy,
    fontWeight: '700',
  },

  // EMPTY STATE

  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
  },

  emptySubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 6,
    textAlign: 'center',
  },

  // MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 18,
  },

  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalAmountBox: {
    backgroundColor: '#F5F7FC',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },

  modalAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.navy,
  },

  modalDetails: {
    marginTop: 22,
  },

  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },

  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },

  modalLabel: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
  },

  modalValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
  },

  doneButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 13,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },

  doneButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 25,
    marginBottom: 10,
  },
});
