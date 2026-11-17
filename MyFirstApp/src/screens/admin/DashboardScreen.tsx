
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useParkingSlotSummary } from '@/hooks/use-parking-slots';
import {
  fetchAdminBookings,
  fetchPendingBookingNotifications,
  type AdminBooking,
  reviewBookingNotification,
  type PendingBookingNotification,
} from '@/services/parking-bookings';

type IconName = keyof typeof Ionicons.glyphMap;
export type AdminDestination =
  | 'parking-slots'
  | 'vehicle-management'
  | 'anpr'
  | 'fine-management'
  | 'payments'
  | 'reports'
  | 'customer-management'
  | 'settings';

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

const metrics: {
  title: string;
  icon: IconName;
  color: string;
  background: string;
}[] = [
  {
    title: 'Total Vehicles Today',
    icon: 'car-outline',
    color: '#F5C400',
    background: '#FFF7D6',
  },
  {
    title: 'Available Slots',
    icon: 'grid-outline',
    color: COLORS.green,
    background: '#DDF5E9',
  },
  {
    title: 'Active Parking',
    icon: 'time-outline',
    color: COLORS.orange,
    background: '#FFF0DB',
  },
  {
    title: 'Total Fine',
    icon: 'wallet-outline',
    color: COLORS.red,
    background: '#FFE4E4',
  },
];

const menuItems: {
  title: string;
  icon: IconName;
}[] = [
  { title: 'Parking Slots', icon: 'grid-outline' },
  { title: 'Vehicle Management', icon: 'car-outline' },
  { title: 'ANPR', icon: 'scan-outline' },
  { title: 'Fine Management', icon: 'document-text-outline' },
  { title: 'Payments', icon: 'card-outline' },
  { title: 'Reports & Analytics', icon: 'bar-chart-outline' },
  { title: 'Customer Management', icon: 'people-outline' },
];

const menuDestinations: Partial<
  Record<(typeof menuItems)[number]['title'], AdminDestination>
> = {
  'Parking Slots': 'parking-slots',
  'Vehicle Management': 'vehicle-management',
  ANPR: 'anpr',
  'Fine Management': 'fine-management',
  Payments: 'payments',
  'Reports & Analytics': 'reports',
  'Customer Management': 'customer-management',
};

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
          size={30}
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

function MenuCard({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuCard,
        pressed && styles.pressedCard,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={32}
        color={COLORS.yellow}
      />

      <Text style={styles.menuTitle}>
        {title}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={COLORS.muted}
      />
    </Pressable>
  );
}

export default function DashboardScreen({
  onNavigate,
}: {
  onNavigate: (destination: AdminDestination) => void;
}) {
  const [notifications, setNotifications] = useState<PendingBookingNotification[]>([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const pending = await fetchPendingBookingNotifications();
      setNotifications(pending);
      setNotificationsError(null);
    } catch (error) {
      setNotificationsError(
        error instanceof Error ? error.message : 'Could not load booking requests.'
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      setBookings(await fetchAdminBookings());
      setBookingsError(null);
    } catch (error) {
      setBookingsError(
        error instanceof Error ? error.message : 'Could not load booking totals.'
      );
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void loadNotifications();
    }, 0);
    const interval = setInterval(() => {
      void loadNotifications();
    }, 15000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void loadBookings();
    }, 0);
    const interval = setInterval(() => {
      void loadBookings();
    }, 15000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadBookings]);

  const decideBooking = async (
    bookingId: string,
    decision: 'APPROVE' | 'REJECT'
  ) => {
    setReviewingBookingId(bookingId);
    try {
      await reviewBookingNotification(bookingId, decision);
      await loadNotifications();
      Alert.alert(
        decision === 'APPROVE' ? 'Booking Approved' : 'Booking Rejected',
        decision === 'APPROVE'
          ? 'The booking request was approved.'
          : 'The booking request was rejected.'
      );
    } catch (error) {
      Alert.alert(
        'Could Not Review Request',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setReviewingBookingId(null);
    }
  };

  const formatNotificationDate = (notification: PendingBookingNotification) =>
    new Date(`${notification.parkingDate}T00:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatNotificationTime = (date: string, time: string) =>
    new Date(`${date}T${time}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const paidBookings = bookings.filter(booking => booking.paymentStatus === 'PAID');
  const totalRevenue = paidBookings.reduce(
    (total, booking) =>
      total + (booking.paymentAmount ?? booking.estimatedPrice + booking.fineAmount),
    0
  );
  const totalFine = bookings.reduce((total, booking) => total + booking.fineAmount, 0);
  const vehiclesToday = bookings.filter(booking => booking.parkingDate === today).length;
  const activeParking = bookings.filter(
    booking => booking.bookingStatus === 'APPROVED' && booking.checkedOutAt === null
  ).length;

  const {
    availableCount,
    isLoading: isLoadingSlotSummary,
    error: slotSummaryError,
    refresh: refreshSlotSummary,
  } = useParkingSlotSummary();

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
            <Pressable
              style={styles.headerIcon}
              onPress={() => {
                setNotificationsVisible(true);
                void loadNotifications();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Booking notifications, ${notifications.length} pending`}
            >
              <Ionicons
                name="notifications-outline"
                size={25}
                color={COLORS.black}
              />

              {notifications.length > 0 && (
                <View style={styles.notificationDot}>
                  <Text style={styles.notificationText}>
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </Text>
                </View>
              )}
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

        <View style={styles.content}>
          <Text style={styles.heading}>
            Dashboard Overview
          </Text>

          <Text style={styles.welcome}>
            Welcome back, Admin!
          </Text>

          <View style={styles.metricsGrid}>
            {metrics.map((item) => (
              <MetricCard
                key={item.title}
                item={item}
                value={
                  bookingsLoading
                    ? '…'
                    : bookingsError
                      ? '—'
                      : item.title === 'Available Slots'
                    ? availableCount === null
                      ? isLoadingSlotSummary
                        ? '…'
                        : '—'
                      : String(availableCount)
                    : item.title === 'Total Vehicles Today'
                      ? String(vehiclesToday)
                      : item.title === 'Active Parking'
                        ? String(activeParking)
                        : `₹${totalFine.toLocaleString('en-IN')}`
                }
              />
            ))}
          </View>
          {bookingsError && (
            <Pressable
              style={styles.slotSummaryError}
              onPress={() => void loadBookings()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading admin totals"
            >
              <Text style={styles.slotSummaryErrorText}>
                Dashboard totals unavailable. Tap to retry.
              </Text>
            </Pressable>
          )}
          {slotSummaryError && (
            <Pressable
              style={styles.slotSummaryError}
              onPress={refreshSlotSummary}
              accessibilityRole="button"
              accessibilityLabel="Retry loading available parking slots"
            >
              <Text style={styles.slotSummaryErrorText}>
                Parking slot count unavailable. Tap to retry.
              </Text>
            </Pressable>
          )}

          <View style={styles.revenueCard}>
            <View style={styles.revenueIcon}>
              <Ionicons
                name="cash-outline"
                size={32}
                color={COLORS.yellow}
              />
            </View>

            <View>
              <Text style={styles.revenueTitle}>
                Total Revenue
              </Text>

              <Text style={styles.revenueValue}>
                {bookingsLoading
                  ? '…'
                  : bookingsError
                    ? '—'
                    : `₹${totalRevenue.toLocaleString('en-IN')}`}
              </Text>

              <Text style={styles.revenueSubtitle}>
                Total paid parking and fine collections
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Management
          </Text>

          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <MenuCard
                key={item.title}
                title={item.title}
                icon={item.icon}
                onPress={() => {
                  const destination = menuDestinations[item.title];
                  if (destination) {
                    onNavigate(destination);
                  }
                }}
              />
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.settingsCard,
              pressed && styles.pressedCard,
            ]}
            onPress={() => onNavigate('settings')}
          >
            <Ionicons
              name="settings-outline"
              size={32}
              color={COLORS.yellow}
            />

            <Text style={styles.settingsTitle}>
              Settings
            </Text>

            <View style={{ flex: 1 }} />

            <Ionicons
              name="chevron-forward"
              size={19}
              color={COLORS.muted}
            />
          </Pressable>
        </View>

        <Text style={styles.footer}>
          SmartPark Admin Panel
        </Text>
      </ScrollView>

      <Modal
        visible={notificationsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.notificationsPanel}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Booking Requests</Text>
              <Pressable
                onPress={() => setNotificationsVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close booking notifications"
              >
                <Ionicons name="close" size={26} color={COLORS.text} />
              </Pressable>
            </View>

            {notificationsLoading && notifications.length === 0 ? (
              <View style={styles.notificationsMessage}>
                <ActivityIndicator color={COLORS.navy} />
              </View>
            ) : notificationsError ? (
              <Pressable
                style={styles.notificationsMessage}
                onPress={() => void loadNotifications()}
              >
                <Text style={styles.notificationError}>{notificationsError}</Text>
                <Text style={styles.retryLabel}>Tap to retry</Text>
              </Pressable>
            ) : notifications.length === 0 ? (
              <View style={styles.notificationsMessage}>
                <Text style={styles.emptyNotifications}>No pending booking requests.</Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.notificationList}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map(notification => {
                  const isReviewing = reviewingBookingId === notification.id;
                  const vehicleTypeLabel =
                    notification.vehicleType === 'BIKE'
                      ? 'Two-wheeler'
                      : notification.vehicleType === 'CAR'
                        ? 'Car'
                        : notification.vehicleType;
                  return (
                    <View key={notification.id} style={styles.notificationCard}>
                      <Text style={styles.notificationHeading}>
                        New {vehicleTypeLabel} parking request
                      </Text>
                      <Text style={styles.notificationDetail}>
                        User: {notification.username} ({notification.userEmail})
                      </Text>
                      <Text style={styles.notificationDetail}>
                        Vehicle type: {vehicleTypeLabel}
                      </Text>
                      <Text style={styles.notificationDetail}>
                        Vehicle: {notification.vehicleNumber}
                      </Text>
                      <Text style={styles.notificationDetail}>
                        Slot: {notification.slotId} · Floor {notification.floorNumber}
                      </Text>
                      <Text style={styles.notificationDetail}>
                        Date: {formatNotificationDate(notification)}
                      </Text>
                      <Text style={styles.notificationDetail}>
                        Entry: {formatNotificationTime(notification.parkingDate, notification.entryTime)}
                        {'  '}Exit: {formatNotificationTime(notification.parkingDate, notification.exitTime)}
                      </Text>
                      <Text style={styles.notificationPrice}>
                        Estimated price: ₹{notification.estimatedPrice}
                      </Text>

                      {isReviewing ? (
                        <ActivityIndicator color={COLORS.navy} />
                      ) : (
                        <View style={styles.notificationActions}>
                          <Pressable
                            style={[styles.reviewButton, styles.rejectButton]}
                            onPress={() => void decideBooking(notification.id, 'REJECT')}
                          >
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.reviewButton, styles.approveButton]}
                            onPress={() => void decideBooking(notification.id, 'APPROVE')}
                          >
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  notificationsPanel: {
    maxHeight: '85%',
    minHeight: '40%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  notificationsTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  notificationsMessage: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  notificationError: {
    color: COLORS.red,
    textAlign: 'center',
  },
  retryLabel: {
    color: COLORS.navy,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyNotifications: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  notificationList: {
    gap: 12,
    paddingBottom: 12,
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    gap: 6,
  },
  notificationHeading: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  notificationDetail: {
    color: COLORS.muted,
    fontSize: 13,
  },
  notificationPrice: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  reviewButton: {
    borderRadius: 9,
    minWidth: 88,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  rejectButtonText: {
    color: COLORS.red,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: COLORS.navy,
  },
  approveButtonText: {
    color: COLORS.white,
    fontWeight: '700',
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

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  slotSummaryError: {
    backgroundColor: '#FFF0DB',
    borderRadius: 10,
    marginTop: 10,
    padding: 11,
  },
  slotSummaryErrorText: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: 'center',
  },

  metricCard: {
    width: '48.5%',
    minHeight: 112,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    width: 43,
    height: 43,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricInfo: {
    flex: 1,
  },

  metricValue: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },

  metricTitle: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  revenueCard: {
    marginTop: 13,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 91,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  revenueIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  revenueTitle: {
    color: COLORS.muted,
    fontSize: 14,
  },

  revenueValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 3,
  },

  revenueSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 27,
    marginBottom: 14,
  },

  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  menuCard: {
    width: '48.5%',
    minHeight: 91,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  menuTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  pressedCard: {
    opacity: 0.75,
  },

  settingsCard: {
    marginTop: 13,
    minHeight: 76,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 2,
  },

  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 25,
    marginBottom: 10,
  },
});
