
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useParkingSlots } from '@/hooks/use-parking-slots';
import {
  checkoutUserBooking,
  fetchUserBookings,
  requestParkingBooking,
  type UserParkingBooking,
} from '@/services/parking-bookings';

type BikeBookingRequest = {
  id: string;
  slotId: string;
  floorNumber: number;
  date: Date;
  entryTime: Date;
  exitTime: Date;
  estimatedPrice: number;
};

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}:00`;

export const calculateLateFine = (
  bookedExitTime: Date,
  actualExitTime: Date
) => {
  const lateMinutes =
    (actualExitTime.getTime() - bookedExitTime.getTime()) / 60000;

  if (lateMinutes <= 0) return 0;

  return Math.ceil(lateMinutes / 20) * 50;
};

type Props = {
  vehicleNumber?: string;
  backendUserId?: string;
  onBack?: () => void;
};

const GREEN = '#16A34A';
const RED = '#DC2626';
const YELLOW = '#F5C400';
const DARK = '#242424';
const MUTED = '#667085';

export default function TwoWheelerParkingScreen({
  vehicleNumber = '',
  backendUserId,
  onBack,
}: Props) {
  const [floor, setFloor] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date());

  const [entryTime, setEntryTime] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 30, 0, 0);
    return date;
  });

  const [exitTime, setExitTime] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() + 2, 0, 0, 0);
    return date;
  });

  const { slots, isLoading, error, refresh } = useParkingSlots(floor, 'BIKE', {
    parkingDate: toLocalDateString(bookingDate),
    entryTime: toLocalTimeString(entryTime),
    exitTime: toLocalTimeString(exitTime),
  });

  const [picker, setPicker] = useState<
    null | 'date' | 'entry' | 'exit'
  >(null);
  const [booking, setBooking] = useState<BikeBookingRequest | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [userBookings, setUserBookings] = useState<UserParkingBooking[]>([]);
  const [isLoadingUserBookings, setIsLoadingUserBookings] = useState(
    Boolean(backendUserId)
  );
  const [userBookingsError, setUserBookingsError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (!backendUserId) return;

    let active = true;
    let requestInFlight = false;

    const loadUserBookings = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const latestBookings = await fetchUserBookings(backendUserId);
        if (active) {
          setUserBookings(latestBookings);
          setUserBookingsError(null);
        }
      } catch (loadError) {
        if (active) {
          setUserBookingsError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your active parking.'
          );
        }
      } finally {
        requestInFlight = false;
        if (active) setIsLoadingUserBookings(false);
      }
    };

    void loadUserBookings();
    const intervalId = setInterval(() => void loadUserBookings(), 15_000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [backendUserId]);

  const selectedSlotData = slots.find(
    slot => slot.slotNumber === selectedSlot
  );

  const activeBookingForSlot = (slotId: string) => {
    const normalizedVehicleNumber = vehicleNumber.toUpperCase().replace(/[\s-]/g, '');
    return userBookings.find(booking => {
      const bookingEntry = new Date(
        `${booking.parkingDate}T${booking.entryTime}`
      );
      return (
        booking.bookingStatus === 'APPROVED' &&
        booking.checkedOutAt === null &&
        booking.slotId === slotId &&
        booking.vehicleType === 'BIKE' &&
        booking.vehicleNumber.toUpperCase().replace(/[\s-]/g, '') ===
          normalizedVehicleNumber &&
        Date.now() >= bookingEntry.getTime()
      );
    });
  };

  const createDateTime = (date: Date, time: Date) => {
    const result = new Date(date);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return result;
  };
  const selectedEntryDate = createDateTime(bookingDate, entryTime);
  const selectedExitDate = createDateTime(bookingDate, exitTime);
  const durationMinutes =
    (selectedExitDate.getTime() - selectedEntryDate.getTime()) / 60000;
  const durationHours =
    durationMinutes > 0 ? Math.ceil(durationMinutes / 60) : 0;
  const estimatedAmount = durationHours * 20;

  const availableCount = slots.filter(
    slot => slot.status === 'AVAILABLE'
  ).length;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const changePickerValue = (value?: Date) => {
    if (!value || !picker) {
      setPicker(null);
      return;
    }

    if (picker === 'date') {
      setBookingDate(value);
    }

    if (picker === 'entry') {
      setEntryTime(value);
    }

    if (picker === 'exit') {
      setExitTime(value);
    }

    setPicker(null);
  };

  const selectFloor = (newFloor: number) => {
    setFloor(newFloor);
    setSelectedSlot('');
  };

  const sendBookingRequest = async () => {
    if (!backendUserId) {
      Alert.alert(
        'Account registration required',
        'Sign in with a registered account before requesting a parking slot.'
      );
      return;
    }

    if (!vehicleNumber.trim()) {
      Alert.alert(
        'Vehicle number missing',
        'Please complete your vehicle details first.'
      );
      return;
    }

    if (!selectedSlot || selectedSlotData?.status !== 'AVAILABLE') {
      Alert.alert(
        'Select a slot',
        'Please select an available green parking slot.'
      );
      return;
    }

    const now = new Date();

    const selectedEntry = createDateTime(bookingDate, entryTime);

    if (selectedEntry < now) {
      Alert.alert(
        'Invalid entry time',
        'Please select a future entry time.'
      );
      return;
    }

    const selectedExit = createDateTime(bookingDate, exitTime);

    if (selectedExit <= selectedEntry) {
      Alert.alert(
        'Invalid exit time',
        'Exit time must be later than entry time.'
      );
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const savedRequest = await requestParkingBooking({
        userId: backendUserId,
        slotId: selectedSlot,
        vehicleType: '2 Wheeler',
        vehicleNumber,
        parkingDate: toLocalDateString(bookingDate),
        entryTime: toLocalTimeString(selectedEntry),
        exitTime: toLocalTimeString(selectedExit),
      });

      setBooking({
        id: savedRequest.id,
        slotId: savedRequest.slotId,
        floorNumber: savedRequest.floorNumber,
        date: new Date(`${savedRequest.parkingDate}T00:00:00`),
        entryTime: new Date(`${savedRequest.parkingDate}T${savedRequest.entryTime}`),
        exitTime: new Date(`${savedRequest.parkingDate}T${savedRequest.exitTime}`),
        estimatedPrice: savedRequest.estimatedPrice,
      });
      setSelectedSlot('');
      refresh();
      Alert.alert(
        'Request sent',
        'Your bike parking request is saved. The admin will review it.'
      );
    } catch (error) {
      Alert.alert(
        'Booking request failed',
        error instanceof Error ? error.message : 'Could not submit the request.'
      );
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const finishParking = async (bookingToFinish: UserParkingBooking) => {
    if (!backendUserId || isCheckingOut) return;

    setIsCheckingOut(true);
    try {
      await checkoutUserBooking(bookingToFinish.id, backendUserId);
      setUserBookings(previous =>
        previous.map(booking =>
          booking.id === bookingToFinish.id
            ? {
                ...booking,
                bookingStatus: 'COMPLETED',
                checkedOutAt: new Date().toISOString(),
              }
            : booking
        )
      );
      setSelectedSlot('');
      refresh();
      Alert.alert(
        'Parking cancelled',
        'Your booking is completed, any late fine is recorded, and the slot is available.'
      );
    } catch (checkoutError) {
      Alert.alert(
        'Could not cancel parking',
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Please try again.'
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSlotPress = (slotId: string, isAvailable: boolean) => {
    const activeBooking = activeBookingForSlot(slotId);
    if (activeBooking) {
      Alert.alert(
        'Cancel parking?',
        `End parking for ${activeBooking.vehicleNumber} in slot ${slotId}? Any late fine will be recorded.`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, cancel parking',
            style: 'destructive',
            onPress: () => void finishParking(activeBooking),
          },
        ]
      );
      return;
    }

    if (isAvailable) {
      setSelectedSlot(slotId);
      return;
    }

    Alert.alert(
      'Slot unavailable',
      userBookingsError
        ? `Could not check your parking request: ${userBookingsError}`
        : 'You can only end parking from a slot reserved for your vehicle.'
    );
  };

  return (
    <View style={styles.container}>
     <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>Two-Wheeler Parking</Text>
            <Text style={styles.headerSubtitle}>
              Find and reserve your parking slot
            </Text>
          </View>
        </View>

        <View style={styles.vehicleCard}>
          <Text style={styles.smallLabel}>YOUR VEHICLE</Text>
          <Text style={styles.vehicleNumber}>
            {vehicleNumber || 'Vehicle number not provided'}
          </Text>
          <Text style={styles.rate}>₹20 / hour</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Parking Zone</Text>

          <View style={styles.floorRow}>
            {[1, 2, 3].map(item => (
              <TouchableOpacity
                key={item}
                disabled={!!booking}
                onPress={() => selectFloor(item)}
                style={[
                  styles.floorButton,
                  floor === item && styles.activeFloor,
                ]}
              >
                <Text
                  style={[
                    styles.floorText,
                    floor === item && styles.activeFloorText,
                  ]}
                >
                  Floor {item}
                </Text>
                <Text
                  style={[
                    styles.floorSubText,
                    floor === item && styles.activeFloorText,
                  ]}
                >
                  {item === 2 ? 'Popular zone' : 'Parking zone'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: RED }]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: YELLOW }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>

          <View style={styles.slotInfo}>
            <Text style={styles.slotInfoText}>
              {availableCount} slots available on Floor {floor}
            </Text>
            <Text style={styles.slotInfoText}>Entrance ↓</Text>
          </View>

          {isLoadingUserBookings && (
            <Text style={styles.slotsMessageText}>
              Checking your active bookings…
            </Text>
          )}
          {userBookingsError && (
            <Text style={styles.slotsMessageText}>
              Could not load your active parking request: {userBookingsError}
            </Text>
          )}

          {error ? (
            <View style={styles.slotsMessage}>
              <Text style={styles.slotsMessageText}>{error}</Text>
              <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading && slots.length === 0 ? (
            <View style={styles.slotsMessage}>
              <ActivityIndicator color={GREEN} />
              <Text style={styles.slotsMessageText}>Loading parking slots…</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.slotsMessage}>
              <Text style={styles.slotsMessageText}>
                No bike parking slots were found on Floor {floor}.
              </Text>
            </View>
          ) : (
          <View style={styles.slotGrid}>
            {slots.map(slot => {
              const ownBooking = activeBookingForSlot(slot.slotNumber);
              const isMyActiveSlot = Boolean(ownBooking);
              const isAvailable = slot.status === 'AVAILABLE';
              const isSelected =
                selectedSlot === slot.slotNumber && isAvailable && !isMyActiveSlot;
              const backgroundColor = isMyActiveSlot
                ? '#F59E0B'
                : isSelected
                ? YELLOW
                : isAvailable
                ? GREEN
                : slot.status === 'MAINTENANCE'
                ? MUTED
                : RED;

              return (
                <TouchableOpacity
                  key={slot.slotNumber}
                  disabled={
                    isLoadingUserBookings ||
                    isSubmittingBooking ||
                    !!booking ||
                    isCheckingOut ||
                    (!isAvailable && !isMyActiveSlot)
                  }
                  onPress={() => handleSlotPress(slot.slotNumber, isAvailable)}
                  style={[
                    styles.slot,
                    { backgroundColor },
                    isSelected && styles.selectedSlot,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isMyActiveSlot
                      ? `${slot.slotNumber}, your reserved slot, tap to leave`
                      : `${slot.slotNumber}, ${slot.status}`
                  }
                >
                  <Text style={styles.slotIcon}>🛵</Text>
                  <Text style={styles.slotName}>{slot.slotNumber}</Text>
                  <Text style={styles.slotStatus}>
                    {isMyActiveSlot
                      ? 'TAP TO LEAVE'
                      : isSelected
                      ? 'SELECTED'
                      : slot.status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}
        </View>

        {!booking && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <Text style={styles.inputLabel}>Parking Date</Text>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setPicker('date')}
          >
            <Text style={styles.selectValue}>📅  {formatDate(bookingDate)}</Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Entry Time</Text>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setPicker('entry')}
          >
            <Text style={styles.selectValue}>🕒  {formatTime(entryTime)}</Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Exit Time</Text>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setPicker('exit')}
          >
            <Text style={styles.selectValue}>🕒  {formatTime(exitTime)}</Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          {picker && (
            <DateTimePicker
              value={
                picker === 'date'
                  ? bookingDate
                  : picker === 'entry'
                  ? entryTime
                  : exitTime
              }
              mode={picker === 'date' ? 'date' : 'time'}
              minimumDate={picker === 'date' ? new Date() : undefined}
              onChange={(_, value) => changePickerValue(value)}
            />
          )}

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Parking rate</Text>
              <Text style={styles.priceValue}>₹20 / hour</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Duration</Text>
              <Text style={styles.priceValue}>
                {durationHours.toFixed(2)} hours
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Estimated total</Text>
              <Text style={styles.totalValue}>₹{estimatedAmount}</Text>
            </View>
          </View>

          <View style={styles.fineCard}>
            <Text style={styles.fineTitle}>Late Exit Fine</Text>
            <Text style={styles.fineText}>
              If you leave after your booked exit time, an additional fine
              of ₹50 will apply for every 20 minutes late.
            </Text>
            <Text style={styles.fineExample}>
              Example: 21 minutes late = ₹100 fine.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, isSubmittingBooking && styles.disabledButton]}
            onPress={sendBookingRequest}
            disabled={isSubmittingBooking}
          >
            {isSubmittingBooking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmText}>SEND BOOKING REQUEST</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Please arrive at your selected parking zone on time.
          </Text>
        </View>
        )}

        {booking && (
          <View style={styles.section}>
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>Awaiting admin approval</Text>
              <Text style={styles.pendingText}>
                Your booking request has been saved. The slot is reserved for
                the requested time while the admin reviews it.
              </Text>
              <View style={styles.pendingDetailRow}>
                <Text style={styles.pendingLabel}>Vehicle</Text>
                <Text style={styles.pendingValue}>{vehicleNumber}</Text>
              </View>
              <View style={styles.pendingDetailRow}>
                <Text style={styles.pendingLabel}>Slot / Floor</Text>
                <Text style={styles.pendingValue}>
                  {booking.slotId} / Floor {booking.floorNumber}
                </Text>
              </View>
              <View style={styles.pendingDetailRow}>
                <Text style={styles.pendingLabel}>Date</Text>
                <Text style={styles.pendingValue}>{formatDate(booking.date)}</Text>
              </View>
              <View style={styles.pendingDetailRow}>
                <Text style={styles.pendingLabel}>Entry</Text>
                <Text style={styles.pendingValue}>{formatTime(booking.entryTime)}</Text>
              </View>
              <View style={styles.pendingDetailRow}>
                <Text style={styles.pendingLabel}>Exit</Text>
                <Text style={styles.pendingValue}>{formatTime(booking.exitTime)}</Text>
              </View>
              <View style={styles.pendingDetailRow}>
                <Text style={styles.pendingLabel}>Estimated price</Text>
                <Text style={styles.pendingPrice}>₹{booking.estimatedPrice}</Text>
              </View>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onBack}
              >
                <Text style={styles.confirmText}>BACK TO DASHBOARD</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: YELLOW,
    paddingTop: 48,
    paddingBottom: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 32,
    color: DARK,
    lineHeight: 35,
  },
  headerTitleArea: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#514600',
    marginTop: 3,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  smallLabel: {
    fontSize: 11,
    color: '#777777',
    fontWeight: '700',
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
    marginTop: 5,
  },
  rate: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: DARK,
    marginBottom: 14,
  },
  floorRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  floorButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeFloor: {
    backgroundColor: YELLOW,
    borderBottomColor: '#9A7900',
  },
  floorText: {
    color: DARK,
    fontWeight: '700',
  },
  floorSubText: {
    fontSize: 10,
    color: '#777777',
    marginTop: 4,
  },
  activeFloorText: {
    color: '#302700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#555555',
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  slotInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#E6EAF0',
    borderRadius: 14,
    padding: 10,
  },
  slotsMessage: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 10,
    padding: 18,
  },
  slotsMessageText: {
    color: '#555555',
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '800',
  },
  slot: {
    width: '31%',
    minHeight: 91,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  selectedSlot: {
    borderWidth: 3,
    borderColor: '#8A6A00',
  },
  slotIcon: {
    fontSize: 24,
  },
  slotName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 3,
  },
  slotStatus: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3,
  },
  inputLabel: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '700',
    marginTop: 13,
    marginBottom: 7,
  },
  selectField: {
    minHeight: 51,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    color: DARK,
    fontSize: 14,
    fontWeight: '600',
  },
  changeText: {
    color: '#987500',
    fontSize: 12,
    fontWeight: '800',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 13,
    marginTop: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  priceLabel: {
    color: '#666666',
    fontSize: 13,
  },
  priceValue: {
    color: DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 10,
  },
  totalLabel: {
    color: DARK,
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    color: GREEN,
    fontSize: 20,
    fontWeight: '900',
  },
  fineCard: {
    backgroundColor: '#FFF4D6',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  fineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#765600',
  },
  fineText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#604D20',
    marginTop: 5,
  },
  fineExample: {
    fontSize: 12,
    fontWeight: '800',
    color: '#604D20',
    marginTop: 5,
  },
  confirmButton: {
    backgroundColor: '#12B76A',
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.65,
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
  },
  pendingTitle: {
    color: GREEN,
    fontSize: 18,
    fontWeight: '800',
  },
  pendingText: {
    color: '#555555',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 12,
  },
  pendingDetailRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  pendingLabel: {
    color: '#666666',
    fontSize: 13,
  },
  pendingValue: {
    color: DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  pendingPrice: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '900',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#777777',
    marginTop: 13,
    marginBottom: 12,
  },
});
