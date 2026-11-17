import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  checkoutUserBooking,
  fetchUserBookings,
  payUserBooking,
  type UserParkingBooking,
} from '@/services/parking-bookings';

export type VehicleType = '2 Wheeler' | '4 Wheeler';

export type AccountVehicle = {
  vehicleType: VehicleType;
  vehicleNumber: string;
};

export type Account = {
  backendUserId?: string;
  username: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  vehicles?: AccountVehicle[];
};

const COLORS = {
  background: '#FFF8E9',
  brown: '#654719',
  yellow: '#F5B51B',
  white: '#FFFFFF',
  text: '#302715',
  muted: '#746A59',
  border: '#E8DDC7',
  red: '#C92A2A',
};

export function getAccountVehicles(account: Account): AccountVehicle[] {
  if (account.vehicles?.length) {
    return account.vehicles;
  }

  return [{
    vehicleType: account.vehicleType,
    vehicleNumber: account.vehicleNumber,
  }];
}

export function normalizeAccount(account: Account): Account {
  const vehicles = getAccountVehicles(account);
  const firstVehicle = vehicles[0];

  return {
    ...account,
    vehicleType: firstVehicle.vehicleType,
    vehicleNumber: firstVehicle.vehicleNumber,
    vehicles,
  };
}

function MyBookings({ account }: { account: Account }) {
  const [bookings, setBookings] = useState<UserParkingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(account.backendUserId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [workingBookingId, setWorkingBookingId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const userId = account.backendUserId;
    if (!userId) return;

    let active = true;
    const loadBookings = async () => {
      try {
        const latestBookings = await fetchUserBookings(userId);
        if (active) {
          setBookings(latestBookings);
          setCurrentTime(Date.now());
          setLoadError(null);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : 'Could not load your bookings.'
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadBookings();
    const interval = setInterval(() => void loadBookings(), 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [account.backendUserId, refreshVersion]);

  const runBookingAction = async (
    booking: UserParkingBooking,
    action: 'checkout' | 'payment'
  ) => {
    const userId = account.backendUserId;
    if (!userId) return;

    setWorkingBookingId(booking.id);
    setLoadError(null);
    setActionMessage(null);
    try {
      if (action === 'checkout') {
        await checkoutUserBooking(booking.id, userId);
        setActionMessage('Vehicle removed. The parking slot is now available.');
      } else {
        await payUserBooking(booking.id, userId);
        setActionMessage('Payment recorded successfully.');
      }
      setRefreshVersion(version => version + 1);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Could not complete the request.'
      );
    } finally {
      setWorkingBookingId(null);
    }
  };

  const formatBookingTime = (date: string, time: string) =>
    new Date(`${date}T${time}`).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <View style={styles.bookingsSection}>
      <View style={styles.bookingsHeadingRow}>
        <Text style={styles.sectionTitle}>My Parking Requests</Text>
        <Pressable
          onPress={() => setRefreshVersion(version => version + 1)}
          accessibilityRole="button"
          accessibilityLabel="Refresh parking requests"
        >
          <Text style={styles.refreshBookingsText}>Refresh</Text>
        </Pressable>
      </View>

      {actionMessage && (
        <Text style={styles.bookingSuccessText}>{actionMessage}</Text>
      )}
      {loadError && <Text style={styles.bookingErrorText}>{loadError}</Text>}
      {!account.backendUserId ? (
        <Text style={styles.emptyBookingsText}>
          Sign in to a registered account to view parking requests.
        </Text>
      ) : isLoading ? (
        <ActivityIndicator color={COLORS.brown} />
      ) : bookings.length === 0 ? (
        <Text style={styles.emptyBookingsText}>You have no parking requests.</Text>
      ) : (
        bookings.map(booking => {
          const bookingStart = new Date(
            `${booking.parkingDate}T${booking.entryTime}`
          );
          const canCheckout =
            booking.bookingStatus === 'APPROVED' &&
            currentTime >= bookingStart.getTime();
          const isWorking = workingBookingId === booking.id;
          const totalDue = booking.estimatedPrice + booking.fineAmount;
          const statusLabel = {
            PENDING: 'Awaiting admin approval',
            APPROVED: 'Approved · slot reserved',
            REJECTED: 'Rejected · slot released',
            COMPLETED: 'Parking completed',
          }[booking.bookingStatus];

          return (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingCardHeader}>
                <View>
                  <Text style={styles.bookingVehicle}>
                    {booking.vehicleNumber}
                  </Text>
                  <Text style={styles.bookingSlot}>
                    {booking.slotId} · Floor {booking.floorNumber}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.bookingStatus,
                    booking.bookingStatus === 'APPROVED' && styles.approvedStatus,
                    booking.bookingStatus === 'REJECTED' && styles.rejectedStatus,
                    booking.bookingStatus === 'COMPLETED' && styles.completedStatus,
                  ]}
                >
                  {statusLabel}
                </Text>
              </View>

              <Text style={styles.bookingTime}>
                Entry: {formatBookingTime(booking.parkingDate, booking.entryTime)}
              </Text>
              <Text style={styles.bookingTime}>
                Planned exit: {formatBookingTime(booking.parkingDate, booking.exitTime)}
              </Text>

              {booking.bookingStatus === 'REJECTED' && (
                <Text style={styles.bookingHint}>
                  This request was rejected. You cannot park in this slot.
                </Text>
              )}
              {booking.bookingStatus === 'PENDING' && (
                <Text style={styles.bookingHint}>
                  Wait for admin approval before parking.
                </Text>
              )}
              {booking.bookingStatus === 'APPROVED' && (
                <>
                  <Text style={styles.bookingAmount}>
                    Estimated parking: ₹{booking.estimatedPrice}
                  </Text>
                  <Text style={styles.bookingAmount}>
                    Current late fine: ₹{booking.fineAmount}
                  </Text>
                  {canCheckout ? (
                    <Pressable
                      disabled={isWorking}
                      style={styles.bookingActionButton}
                      onPress={() => void runBookingAction(booking, 'checkout')}
                    >
                      <Text style={styles.bookingActionText}>
                        {isWorking ? 'PLEASE WAIT…' : 'REMOVE VEHICLE'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.bookingHint}>
                      The remove-vehicle option is available at the booked entry time.
                    </Text>
                  )}
                </>
              )}
              {booking.bookingStatus === 'COMPLETED' && (
                <>
                  <Text style={styles.bookingAmount}>
                    Parking charge: ₹{booking.estimatedPrice}
                  </Text>
                  <Text style={styles.bookingAmount}>
                    Late fine: ₹{booking.fineAmount}
                  </Text>
                  <Text style={styles.bookingAmount}>
                    Total due: ₹{totalDue}
                  </Text>
                  {booking.paymentStatus === 'PAID' ? (
                    <Text style={styles.bookingSuccessText}>
                      Payment complete (demo)
                    </Text>
                  ) : (
                    <Pressable
                      disabled={isWorking}
                      style={styles.bookingActionButton}
                      onPress={() => void runBookingAction(booking, 'payment')}
                    >
                      <Text style={styles.bookingActionText}>
                        {isWorking ? 'PLEASE WAIT…' : 'PAY NOW · DEMO'}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

export function UserDashboardScreen({
  account,
  onOpenProfile,
  onPark,
}: {
  account: Account;
  onOpenProfile: () => void;
  onPark: (vehicle: AccountVehicle) => void;
}) {
  const vehicles = getAccountVehicles(account);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardHeaderTop}>
            <Text style={styles.brand}>EasyPark</Text>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={onOpenProfile}
              accessibilityRole="button"
              accessibilityLabel="Open profile and manage vehicles"
            >
              <Ionicons name="person-circle-outline" size={20} color={COLORS.brown} />
              <Text style={styles.profileButtonText}>Profile</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.welcome}>Welcome, {account.username}</Text>
          <Text style={styles.subtitle}>Choose a vehicle to find parking.</Text>
        </View>

        <Text style={styles.sectionTitle}>My Vehicles</Text>

        {vehicles.map((vehicle, index) => (
          <View
            key={`${vehicle.vehicleType}-${vehicle.vehicleNumber}-${index}`}
            style={styles.vehicleCard}
          >
            <View style={styles.vehicleCardHeader}>
              <Text style={styles.vehicleEmoji}>
                {vehicle.vehicleType === '2 Wheeler' ? '🏍️' : '🚗'}
              </Text>
            </View>

            <Text style={styles.vehicleType}>{vehicle.vehicleType}</Text>
            <Text style={styles.vehicleNumber}>{vehicle.vehicleNumber}</Text>

            <TouchableOpacity
              style={styles.parkButton}
              onPress={() => onPark(vehicle)}
              accessibilityRole="button"
            >
              <Text style={styles.parkButtonText}>Find Parking</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.brown} />
            </TouchableOpacity>
          </View>
        ))}
        <MyBookings account={account} />
      </ScrollView>
    </View>
  );
}

export function UserProfileScreen({
  account,
  onBack,
  onSave,
  onLogout,
}: {
  account: Account;
  onBack: () => void;
  onSave: (account: Account) => Promise<void>;
  onLogout: () => void;
}) {
  const [username, setUsername] = useState(account.username);
  const [email, setEmail] = useState(account.email);
  const [phone, setPhone] = useState(account.phone);
  const [vehicles, setVehicles] = useState<AccountVehicle[]>(
    () => getAccountVehicles(account).map(vehicle => ({ ...vehicle }))
  );
  const [newVehicleType, setNewVehicleType] = useState<VehicleType>('2 Wheeler');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const addVehicle = () => {
    const vehicleNumber = newVehicleNumber.toUpperCase().replace(/[\s-]/g, '');
    if (!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/.test(vehicleNumber)) {
      Alert.alert('Invalid Vehicle Number', 'Enter a valid vehicle number, for example MH02AB1234.');
      return;
    }

    const alreadyAdded = vehicles.some(
      vehicle =>
        vehicle.vehicleType === newVehicleType &&
        vehicle.vehicleNumber === vehicleNumber
    );
    if (alreadyAdded) {
      Alert.alert('Vehicle Already Added', 'This vehicle is already in your profile.');
      return;
    }

    setVehicles(previous => [
      ...previous,
      { vehicleType: newVehicleType, vehicleNumber },
    ]);
    setNewVehicleNumber('');
  };

  const saveProfile = async () => {
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (normalizedUsername.length < 3) {
      Alert.alert('Invalid Name', 'Name must have at least 3 characters.');
      return;
    }
    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      Alert.alert('Invalid Email', 'Enter a valid email address.');
      return;
    }
    if (account.backendUserId && !normalizedEmail) {
      Alert.alert('Email Required', 'A registered account must have an email address.');
      return;
    }
    if (normalizedPhone && !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      Alert.alert('Invalid Phone Number', 'Enter a valid 10-digit phone number.');
      return;
    }
    if (account.backendUserId && !normalizedPhone) {
      Alert.alert('Phone Required', 'A registered account must have a phone number.');
      return;
    }
    if (vehicles.length === 0) {
      Alert.alert('Vehicle Required', 'Keep at least one vehicle in your profile.');
      return;
    }

    const normalizedVehicles = vehicles.map(vehicle => ({
      vehicleType: vehicle.vehicleType,
      vehicleNumber: vehicle.vehicleNumber.toUpperCase().replace(/[\s-]/g, ''),
    }));
    const invalidVehicle = normalizedVehicles.some(
      vehicle => !/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/.test(vehicle.vehicleNumber)
    );
    if (invalidVehicle) {
      Alert.alert('Invalid Vehicle Number', 'Check the vehicle numbers in your profile.');
      return;
    }

    const firstVehicle = normalizedVehicles[0];
    const updatedAccount: Account = {
      ...account,
      username: normalizedUsername,
      email: normalizedEmail,
      phone: normalizedPhone,
      vehicleType: firstVehicle.vehicleType,
      vehicleNumber: firstVehicle.vehicleNumber,
      vehicles: normalizedVehicles,
    };

    setIsSaving(true);
    try {
      await onSave(updatedAccount);
      Alert.alert('Profile Saved', 'Your profile and vehicles have been updated.');
    } catch (error) {
      Alert.alert(
        'Save Failed',
        error instanceof Error ? error.message : 'Your profile could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const finishLogout = () => {
    setLogoutVisible(false);
    onLogout();
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.profileContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to user home"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.brown} />
          </TouchableOpacity>
          <View>
            <Text style={styles.profileTitle}>My Profile</Text>
            <Text style={styles.subtitle}>Edit your details and vehicles.</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Your name"
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>My Vehicles</Text>

          {vehicles.map((vehicle, index) => (
            <View key={`${vehicle.vehicleType}-${index}`} style={styles.vehicleEditor}>
              <View style={styles.vehicleEditorHeader}>
                <Text style={styles.fieldLabel}>Vehicle {index + 1}</Text>
                {vehicles.length > 1 && (
                  <Pressable
                    onPress={() => setVehicles(previous => previous.filter((_, itemIndex) => itemIndex !== index))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove vehicle ${index + 1}`}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                  </Pressable>
                )}
              </View>

              <View style={styles.typeRow}>
                {(['2 Wheeler', '4 Wheeler'] as VehicleType[]).map(type => (
                  <Pressable
                    key={type}
                    style={[styles.typeButton, vehicle.vehicleType === type && styles.typeButtonSelected]}
                    onPress={() => setVehicles(previous => previous.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, vehicleType: type } : item
                    ))}
                  >
                    <Text style={[styles.typeButtonText, vehicle.vehicleType === type && styles.typeButtonTextSelected]}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                value={vehicle.vehicleNumber}
                onChangeText={value => setVehicles(previous => previous.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, vehicleNumber: value.toUpperCase() } : item
                ))}
                placeholder="Vehicle number"
                autoCapitalize="characters"
              />
            </View>
          ))}

          <Text style={styles.fieldLabel}>Add another vehicle</Text>
          <View style={styles.typeRow}>
            {(['2 Wheeler', '4 Wheeler'] as VehicleType[]).map(type => (
              <Pressable
                key={type}
                style={[styles.typeButton, newVehicleType === type && styles.typeButtonSelected]}
                onPress={() => setNewVehicleType(type)}
              >
                <Text style={[styles.typeButtonText, newVehicleType === type && styles.typeButtonTextSelected]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={newVehicleNumber}
            onChangeText={value => setNewVehicleNumber(value.toUpperCase())}
            placeholder="Vehicle number"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={addVehicle}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.brown} />
            <Text style={styles.secondaryButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          onPress={saveProfile}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Save Profile'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutVisible(true)}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalMessage}>
              You will be signed out and returned to the role selection screen.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={finishLogout}
              >
                <Text style={styles.confirmButtonText}>Log out</Text>
              </TouchableOpacity>
            </View>
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
  dashboardContent: {
    padding: 20,
    paddingBottom: 36,
  },
  dashboardHeader: {
    marginBottom: 22,
  },
  dashboardHeaderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    color: COLORS.brown,
    fontSize: 24,
    fontWeight: '900',
  },
  welcome: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 13,
  },
  bookingsSection: {
    marginTop: 12,
  },
  bookingsHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refreshBookingsText: {
    color: COLORS.brown,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 13,
  },
  emptyBookingsText: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15,
  },
  bookingCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bookingVehicle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  bookingSlot: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  bookingStatus: {
    color: COLORS.muted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  approvedStatus: {
    color: '#16834A',
  },
  rejectedStatus: {
    color: COLORS.red,
  },
  completedStatus: {
    color: COLORS.brown,
  },
  bookingTime: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 4,
  },
  bookingHint: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  bookingAmount: {
    color: COLORS.text,
    fontSize: 13,
    marginTop: 7,
  },
  bookingSuccessText: {
    color: '#16834A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  bookingErrorText: {
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 10,
  },
  bookingActionButton: {
    alignItems: 'center',
    backgroundColor: COLORS.yellow,
    borderRadius: 10,
    marginTop: 12,
    minHeight: 43,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  bookingActionText: {
    color: COLORS.brown,
    fontSize: 13,
    fontWeight: '900',
  },
  vehicleCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 17,
  },
  vehicleCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleEmoji: {
    fontSize: 31,
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: '#FFF2D5',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileButtonText: {
    color: COLORS.brown,
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleType: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 12,
  },
  vehicleNumber: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 3,
  },
  parkButton: {
    alignItems: 'center',
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 15,
    minHeight: 47,
  },
  parkButtonText: {
    color: COLORS.brown,
    fontSize: 14,
    fontWeight: '800',
  },
  profileContent: {
    padding: 18,
    paddingBottom: 35,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    marginBottom: 18,
    marginTop: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  profileTitle: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 15,
    padding: 16,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#FFFCF6',
    borderColor: COLORS.border,
    borderRadius: 11,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 14,
    height: 48,
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  vehicleEditor: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginBottom: 15,
    paddingBottom: 4,
  },
  vehicleEditorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 11,
  },
  typeButton: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  typeButtonSelected: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  typeButtonText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  typeButtonTextSelected: {
    color: COLORS.brown,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 4,
    paddingVertical: 7,
  },
  secondaryButtonText: {
    color: COLORS.brown,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: COLORS.yellow,
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.brown,
    fontSize: 15,
    fontWeight: '800',
  },
  logoutButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 20,
  },
  logoutButtonText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    backgroundColor: '#00000080',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  modalMessage: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    alignItems: 'center',
    borderRadius: 11,
    justifyContent: 'center',
    minWidth: 95,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  cancelButton: {
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  confirmButton: {
    backgroundColor: COLORS.red,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
