
import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useParkingSlots } from "@/hooks/use-parking-slots";
import type { ParkingSlot } from "@/services/parking-slots";
import {
  checkoutUserBooking,
  fetchUserBookings,
  requestParkingBooking,
  type UserParkingBooking,
} from "@/services/parking-bookings";

type Slot = {
  id: string;
  zone: string;
  available: boolean;
  status: ParkingSlot["status"];
};

type Booking = {
  id: string;
  slotId: string;
  zone: string;
  date: Date;
  entryTime: Date;
  exitTime: Date;
  duration: number;
  parkingCharge: number;
};

type Props = {
  vehicleNumber?: string;
  backendUserId?: string;
  onBack?: () => void;
};

const GREEN = "#16A34A";
const RED = "#DC2626";
const YELLOW = "#F5C400";
const DARK = "#242424";
const WHITE = "#FFFFFF";

const RATE = 30;

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toLocalTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:00`;

export default function FourWheelerParkingScreen({
  vehicleNumber = "",
  backendUserId,
  onBack,
}: Props) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState("Zone A");
  const activeFloor = ["Zone A", "Zone B", "Zone C"].indexOf(activeZone) + 1;
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [entryTime, setEntryTime] = useState<Date | null>(null);
  const [exitTime, setExitTime] = useState<Date | null>(null);
  const availabilityWindow =
    bookingDate &&
    entryTime &&
    exitTime &&
    toLocalTimeString(exitTime) > toLocalTimeString(entryTime)
      ? {
          parkingDate: toLocalDateString(bookingDate),
          entryTime: toLocalTimeString(entryTime),
          exitTime: toLocalTimeString(exitTime),
        }
      : undefined;
  const {
    slots: backendSlots,
    isLoading,
    error,
    refresh,
  } = useParkingSlots(activeFloor, "CAR", availabilityWindow);

  const [picker, setPicker] = useState<
    null | "date" | "entry" | "exit"
  >(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [userBookings, setUserBookings] = useState<UserParkingBooking[]>([]);
  const [isLoadingUserBookings, setIsLoadingUserBookings] = useState(
    Boolean(backendUserId)
  );
  const [userBookingsError, setUserBookingsError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(Date.now()), 15_000);
    return () => clearInterval(timerId);
  }, []);

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
          setCurrentTime(Date.now());
          setUserBookingsError(null);
        }
      } catch (loadError) {
        if (active) {
          setUserBookingsError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your active parking."
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

  const zoneSlots = useMemo<Slot[]>(
    () => backendSlots.map(slot => ({
      id: slot.slotNumber,
      zone: activeZone,
      available: slot.status === "AVAILABLE",
      status: slot.status,
    })),
    [activeZone, backendSlots]
  );

  const selectedSlotData = zoneSlots.find(
    slot => slot.id === selectedSlot
  );

  const activeBookingForSlot = (slotId: string) => {
    const normalizedVehicleNumber = vehicleNumber.toUpperCase().replace(/[\s-]/g, "");
    return userBookings.find(booking => {
      const bookingEntry = new Date(
        `${booking.parkingDate}T${booking.entryTime}`
      );
      return (
        booking.bookingStatus === "APPROVED" &&
        booking.checkedOutAt === null &&
        booking.slotId === slotId &&
        booking.vehicleType === "CAR" &&
        booking.vehicleNumber.toUpperCase().replace(/[\s-]/g, "") ===
          normalizedVehicleNumber &&
        Date.now() >= bookingEntry.getTime()
      );
    });
  };
  const activeUserBookings = userBookings.filter(booking => {
    const bookingEntry = new Date(`${booking.parkingDate}T${booking.entryTime}`);
    return (
      booking.bookingStatus === "APPROVED" &&
      booking.checkedOutAt === null &&
      booking.vehicleType === "CAR" &&
      booking.vehicleNumber.toUpperCase().replace(/[\s-]/g, "") ===
        vehicleNumber.toUpperCase().replace(/[\s-]/g, "") &&
      currentTime >= bookingEntry.getTime()
    );
  });

  const availableCount = zoneSlots.filter(
    slot => slot.status === "AVAILABLE"
  ).length;

  const totalAvailable = availableCount;

  const formatDate = (date: Date | null) =>
    date
      ? date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Select date";

  const formatTime = (date: Date | null) =>
    date
      ? date.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "Select time";

  const createDateTime = (date: Date, time: Date) => {
    const result = new Date(date);
    result.setHours(
      time.getHours(),
      time.getMinutes(),
      0,
      0
    );
    return result;
  };

  const entryDate =
    bookingDate && entryTime ? createDateTime(bookingDate, entryTime) : null;
  const exitDate =
    bookingDate && exitTime ? createDateTime(bookingDate, exitTime) : null;

  const durationMinutes =
    entryDate && exitDate
      ? (exitDate.getTime() - entryDate.getTime()) / 60000
      : 0;

  const durationHours =
    durationMinutes > 0 ? Math.ceil(durationMinutes / 60) : 0;

  const estimatedAmount = durationHours * RATE;

  const changePickerValue = (value?: Date) => {
    if (!value || !picker) {
      setPicker(null);
      return;
    }

    if (picker === "date") {
      setBookingDate(value);
    }

    if (picker === "entry") {
      setEntryTime(value);
    }

    if (picker === "exit") {
      setExitTime(value);
    }

    setPicker(null);
  };

  const selectZone = (zone: string) => {
    setActiveZone(zone);
    setSelectedSlot(null);
  };

  const bookParking = async () => {
    if (!backendUserId) {
      Alert.alert(
        "Account Registration Required",
        "This demo account is not registered with the parking server. Sign up with a user account before requesting a slot."
      );
      return;
    }

    if (!vehicleNumber.trim()) {
      Alert.alert(
        "Vehicle Number Missing",
        "Please complete your vehicle details first."
      );
      return;
    }

    if (!selectedSlot || !selectedSlotData) {
      Alert.alert(
        "Select a Slot",
        "Please select an available parking slot."
      );
      return;
    }

    if (!selectedSlotData.available) {
      Alert.alert(
        "Unavailable",
        "This parking slot is occupied."
      );
      return;
    }

    if (!bookingDate || !entryTime || !exitTime) {
      Alert.alert(
        "Select Parking Time",
        "Choose the parking date, entry time, and exit time before requesting a slot."
      );
      return;
    }

    const selectedEntryDate = createDateTime(bookingDate, entryTime);
    const selectedExitDate = createDateTime(bookingDate, exitTime);

    if (selectedExitDate <= selectedEntryDate) {
      Alert.alert(
        "Invalid Time",
        "Exit time must be later than entry time."
      );
      return;
    }

    if (selectedEntryDate < new Date()) {
      Alert.alert(
        "Invalid Entry",
        "Please select a future entry time."
      );
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const savedRequest = await requestParkingBooking({
        userId: backendUserId,
        slotId: selectedSlot,
        vehicleType: "4 Wheeler",
        vehicleNumber,
        parkingDate: toLocalDateString(bookingDate),
        entryTime: toLocalTimeString(selectedEntryDate),
        exitTime: toLocalTimeString(selectedExitDate),
      });

      const hours = Math.ceil(durationMinutes / 60);
      setBooking({
        id: savedRequest.id,
        slotId: savedRequest.slotId,
        zone: selectedSlotData.zone,
        date: new Date(`${savedRequest.parkingDate}T00:00:00`),
        entryTime: new Date(`${savedRequest.parkingDate}T${savedRequest.entryTime}`),
        exitTime: new Date(`${savedRequest.parkingDate}T${savedRequest.exitTime}`),
        duration: hours,
        parkingCharge: savedRequest.estimatedPrice,
      });
      setSelectedSlot(null);
      refresh();
      Alert.alert(
        "Request Sent",
        "Your booking request is saved. The admin will review and approve or reject it."
      );
    } catch (error) {
      Alert.alert(
        "Booking Request Failed",
        error instanceof Error ? error.message : "Could not submit the booking request."
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
                bookingStatus: "COMPLETED",
                checkedOutAt: new Date().toISOString(),
              }
            : booking
        )
      );
      setSelectedSlot(null);
      refresh();
      Alert.alert(
        "Parking cancelled",
        "Your booking is completed, any late fine is recorded, and the slot is available."
      );
    } catch (checkoutError) {
      Alert.alert(
        "Could not cancel parking",
        checkoutError instanceof Error
          ? checkoutError.message
          : "Please try again."
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  const confirmCancelParking = (bookingToFinish: UserParkingBooking) => {
    Alert.alert(
      "Cancel parking?",
      `End parking for ${bookingToFinish.vehicleNumber} in slot ${bookingToFinish.slotId}? Any late fine will be recorded.`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel parking",
          style: "destructive",
          onPress: () => void finishParking(bookingToFinish),
        },
      ]
    );
  };

  const handleSlotPress = (slotId: string, isAvailable: boolean) => {
    const activeBooking = activeBookingForSlot(slotId);
    if (activeBooking) {
      confirmCancelParking(activeBooking);
      return;
    }

    if (isAvailable) {
      setSelectedSlot(slotId);
      return;
    }

    Alert.alert(
      "Slot unavailable",
      userBookingsError
        ? `Could not check your parking request: ${userBookingsError}`
        : "You can only end parking from a slot reserved for your vehicle."
    );
  };

  const renderReceiptRow = (label: string, value: string) => (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={styles.receiptValue}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleArea}>
            <Text style={styles.headerTitle}>
              Four-Wheeler Parking
            </Text>
            <Text style={styles.headerSubtitle}>
              Find and reserve your parking slot
            </Text>
          </View>

          <Text style={styles.headerIcon}>🚗</Text>
        </View>

        {/* VEHICLE DETAILS */}
        <View style={styles.vehicleCard}>
          <Text style={styles.smallLabel}>
            YOUR VEHICLE
          </Text>

          <Text style={styles.vehicleNumber}>
            {vehicleNumber || "Vehicle number not provided"}
          </Text>

          <Text style={styles.vehicleType}>
            Four Wheeler
          </Text>

          <Text style={styles.rate}>₹30 / hour</Text>
        </View>

        {/* PARKING ZONES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Parking Zone
          </Text>

          <View style={styles.zoneRow}>
            {["Zone A", "Zone B", "Zone C"].map(zone => (
              <TouchableOpacity
                key={zone}
                onPress={() => selectZone(zone)}
                style={[
                  styles.zoneButton,
                  activeZone === zone && styles.activeZone,
                ]}
              >
                <Text
                  style={[
                    styles.zoneText,
                    activeZone === zone && styles.activeZoneText,
                  ]}
                >
                  {zone}
                </Text>

                <Text
                  style={[
                    styles.zoneSubText,
                    activeZone === zone && styles.activeZoneText,
                  ]}
                >
                  Parking zone
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* LEGEND */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: GREEN },
                ]}
              />
              <Text style={styles.legendText}>Available</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: RED },
                ]}
              />
              <Text style={styles.legendText}>Occupied</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: "#F59E0B" },
                ]}
              />
              <Text style={styles.legendText}>Reserved</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: YELLOW },
                ]}
              />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>

          {/* SLOT INFORMATION */}
          <View style={styles.slotInfo}>
            <Text style={styles.slotInfoText}>
              {availableCount} slots available in {activeZone}
            </Text>

            <Text style={styles.slotInfoText}>
              Entrance ↓
            </Text>
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

          {/* PARKING SLOTS */}
          {error ? (
            <View style={styles.slotsMessage}>
              <Text style={styles.slotsMessageText}>{error}</Text>
              <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading && zoneSlots.length === 0 ? (
            <View style={styles.slotsMessage}>
              <ActivityIndicator color={GREEN} />
              <Text style={styles.slotsMessageText}>Loading parking slots…</Text>
            </View>
          ) : zoneSlots.length === 0 ? (
            <View style={styles.slotsMessage}>
              <Text style={styles.slotsMessageText}>
                No car parking slots were found in {activeZone}.
              </Text>
            </View>
          ) : (
          <View style={styles.slotGrid}>
            {zoneSlots.map(slot => {
              const ownBooking = activeBookingForSlot(slot.id);
              const isMyActiveSlot = Boolean(ownBooking);
              const isAvailable = slot.status === "AVAILABLE";
              const isSelected =
                selectedSlot === slot.id && isAvailable && !isMyActiveSlot;

              const backgroundColor = isMyActiveSlot
                ? "#F59E0B"
                : isSelected
                ? YELLOW
                : isAvailable
                ? GREEN
                : slot.status === "RESERVED"
                ? "#F59E0B"
                : slot.status === "MAINTENANCE"
                ? "#667085"
                : RED;

              return (
                <TouchableOpacity
                  key={slot.id}
                  disabled={
                    isLoadingUserBookings ||
                    isSubmittingBooking ||
                    !!booking ||
                    isCheckingOut ||
                    (!isAvailable && !isMyActiveSlot)
                  }
                  onPress={() => handleSlotPress(slot.id, isAvailable)}
                  style={[
                    styles.slot,
                    { backgroundColor },
                    isSelected && styles.selectedSlot,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isMyActiveSlot
                      ? `${slot.id}, your reserved slot, tap to leave`
                      : `${slot.id}, ${slot.status}`
                  }
                >
                  <Text style={styles.slotIcon}>🚗</Text>

                  <Text
                    style={[
                      styles.slotName,
                      isSelected && styles.selectedSlotText,
                    ]}
                  >
                    {slot.id}
                  </Text>

                  <Text
                    style={[
                      styles.slotStatus,
                      isSelected && styles.selectedSlotText,
                    ]}
                  >
                    {isMyActiveSlot
                      ? "TAP TO LEAVE"
                      : isSelected
                      ? "SELECTED"
                      : slot.status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}

          <Text style={styles.zoneSummary}>
            Available slots in this zone: {totalAvailable} / {zoneSlots.length}
          </Text>

          {activeUserBookings.map(activeBooking => (
            <View key={activeBooking.id} style={styles.activeBookingCard}>
              <Text style={styles.activeBookingTitle}>Your car is parked</Text>
              <Text style={styles.activeBookingText}>
                {activeBooking.vehicleNumber} · {activeBooking.slotId}
              </Text>
              <TouchableOpacity
                disabled={isCheckingOut}
                style={[
                  styles.removeVehicleButton,
                  isCheckingOut && styles.disabledButton,
                ]}
                onPress={() => confirmCancelParking(activeBooking)}
                accessibilityRole="button"
              >
                {isCheckingOut ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <Text style={styles.removeVehicleButtonText}>REMOVE VEHICLE</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* BOOKING DETAILS */}
        {!booking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Booking Details
            </Text>

            <Text style={styles.inputLabel}>
              Parking Date
            </Text>

            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setPicker("date")}
            >
              <Text style={styles.selectValue}>
                📅  {formatDate(bookingDate)}
              </Text>
              <Text style={styles.changeText}>
                {bookingDate ? "Change" : "Select"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>
              Entry Time
            </Text>

            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setPicker("entry")}
            >
              <Text style={styles.selectValue}>
                🕒  {formatTime(entryTime)}
              </Text>
              <Text style={styles.changeText}>
                {entryTime ? "Change" : "Select"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>
              Exit Time
            </Text>

            <TouchableOpacity
              style={styles.selectField}
              onPress={() => setPicker("exit")}
            >
              <Text style={styles.selectValue}>
                🕒  {formatTime(exitTime)}
              </Text>
              <Text style={styles.changeText}>
                {exitTime ? "Change" : "Select"}
              </Text>
            </TouchableOpacity>

            {picker && (
              <DateTimePicker
                value={
                  picker === "date"
                    ? bookingDate ?? new Date()
                    : picker === "entry"
                    ? entryTime ?? new Date()
                    : exitTime ?? new Date()
                }
                mode={picker === "date" ? "date" : "time"}
                minimumDate={
                  picker === "date" ? new Date() : undefined
                }
                onChange={(_, value) => changePickerValue(value)}
              />
            )}

            {/* PRICE CALCULATION */}
            <View style={styles.priceCard}>
              <Text style={styles.calculationTitle}>
                Parking Cost Estimate
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Parking rate
                </Text>
                <Text style={styles.priceValue}>
                  ₹30 / hour
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Duration
                </Text>
                <Text style={styles.priceValue}>
                  {durationMinutes > 0 && entryDate && exitDate
                    ? `${Math.floor(durationMinutes / 60)} hr ${Math.round(
                        durationMinutes % 60
                      )} min`
                    : "--"}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Billable hours
                </Text>
                <Text style={styles.priceValue}>
                  {entryDate && exitDate && durationMinutes > 0
                    ? `${durationHours} hour(s)`
                    : "—"}
                </Text>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  Estimated total
                </Text>
                <Text style={styles.totalValue}>
                  {entryDate && exitDate && durationMinutes > 0
                    ? `₹${estimatedAmount}`
                    : "—"}
                </Text>
              </View>
            </View>

            {/* LATE FINE */}
            <View style={styles.fineCard}>
              <Text style={styles.fineTitle}>
                Late Exit Fine
              </Text>

              <Text style={styles.fineText}>
                If you leave after your booked exit time,
                an additional fine of ₹70 will apply for
                every 20 minutes late.
              </Text>

              <Text style={styles.fineExample}>
                Example: 21 minutes late = ₹140 fine.
              </Text>
            </View>

            <Text style={styles.selectedInfo}>
              {selectedSlot
                ? `Selected Slot: ${selectedSlot} (${selectedSlotData?.zone})`
                : "Please select an available parking slot above."}
            </Text>

            <TouchableOpacity
              style={[styles.confirmButton, isSubmittingBooking && styles.disabledButton]}
              onPress={bookParking}
              disabled={isSubmittingBooking}
            >
              {isSubmittingBooking ? (
                <ActivityIndicator color={DARK} />
              ) : (
                <Text style={styles.confirmText}>SEND BOOKING REQUEST</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Please arrive at your selected parking zone on time.
            </Text>
          </View>
        )}

        {/* PENDING ADMIN REVIEW */}
        {booking && (
          <View style={styles.section}>
            <View style={styles.bookingCard}>
              <View style={styles.successHeader}>
                <Text style={styles.successIcon}>…</Text>
                <Text style={styles.successTitle}>
                  Awaiting Admin Approval
                </Text>
              </View>

              <Text style={styles.bookingMessage}>
                Your request has been saved. The slot is not confirmed until the admin approves it.
              </Text>

              {renderReceiptRow("Vehicle Number", vehicleNumber)}
              {renderReceiptRow("Parking Zone", booking.zone)}
              {renderReceiptRow("Parking Slot", booking.slotId)}
              {renderReceiptRow("Date", formatDate(booking.date))}
              {renderReceiptRow("Entry Time", formatTime(booking.entryTime))}
              {renderReceiptRow("Exit Time", formatTime(booking.exitTime))}
              {renderReceiptRow("Duration", `${booking.duration} hour(s)`)}

              <View style={styles.priceDivider} />

              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>
                  Parking Fee
                </Text>
                <Text style={styles.totalValue}>
                  ₹{booking.parkingCharge}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutButton}
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
    backgroundColor: "#F5F6FA",
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    backgroundColor: YELLOW,
    paddingTop: 48,
    paddingBottom: 22,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 32,
    color: DARK,
    lineHeight: 35,
  },

  headerTitleArea: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#514600",
    marginTop: 3,
  },

  headerIcon: {
    fontSize: 30,
    marginLeft: 8,
  },

  vehicleCard: {
    backgroundColor: WHITE,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },

  smallLabel: {
    fontSize: 11,
    color: "#777777",
    fontWeight: "700",
  },

  vehicleNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
    marginTop: 5,
  },

  vehicleType: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
  },

  rate: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: DARK,
    marginBottom: 14,
  },

  zoneRow: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 12,
    overflow: "hidden",
  },

  zoneButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },

  activeZone: {
    backgroundColor: YELLOW,
    borderBottomColor: "#9A7900",
  },

  zoneText: {
    color: DARK,
    fontWeight: "700",
    fontSize: 13,
  },

  zoneSubText: {
    fontSize: 10,
    color: "#777777",
    marginTop: 4,
  },

  activeZoneText: {
    color: "#302700",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 6,
  },

  legendText: {
    fontSize: 12,
    color: "#555555",
  },

  slotInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  slotInfoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555555",
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#E6EAF0",
    borderRadius: 14,
    padding: 10,
  },

  slot: {
    width: "31%",
    minHeight: 91,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  selectedSlot: {
    borderWidth: 3,
    borderColor: "#8A6A00",
  },

  slotIcon: {
    fontSize: 24,
  },

  slotName: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 12,
    marginTop: 3,
  },

  slotStatus: {
    color: WHITE,
    fontSize: 8,
    fontWeight: "800",
    marginTop: 3,
  },

  selectedSlotText: {
    color: DARK,
  },

  zoneSummary: {
    fontSize: 11,
    color: "#666666",
    marginTop: 10,
    textAlign: "right",
  },
  activeBookingCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF7E6",
    borderWidth: 1,
    borderColor: "#F5C400",
  },
  activeBookingTitle: {
    color: DARK,
    fontSize: 15,
    fontWeight: "800",
  },
  activeBookingText: {
    color: "#555555",
    fontSize: 13,
    marginTop: 4,
  },
  removeVehicleButton: {
    marginTop: 12,
    backgroundColor: RED,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  removeVehicleButtonText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 13,
  },

  slotsMessage: {
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 12,
    gap: 10,
    padding: 18,
  },

  slotsMessageText: {
    color: "#555555",
    fontSize: 13,
    textAlign: "center",
  },

  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  retryText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "800",
  },

  inputLabel: {
    fontSize: 13,
    color: "#555555",
    fontWeight: "700",
    marginTop: 13,
    marginBottom: 7,
  },

  selectField: {
    minHeight: 51,
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectValue: {
    color: DARK,
    fontSize: 14,
    fontWeight: "600",
  },

  changeText: {
    color: "#987500",
    fontSize: 12,
    fontWeight: "800",
  },

  priceCard: {
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 13,
    marginTop: 20,
  },

  calculationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
    marginBottom: 12,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },

  priceLabel: {
    color: "#666666",
    fontSize: 13,
  },

  priceValue: {
    color: DARK,
    fontSize: 13,
    fontWeight: "700",
  },

  priceDivider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 10,
  },

  totalLabel: {
    color: DARK,
    fontSize: 15,
    fontWeight: "800",
  },

  totalValue: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "900",
  },

  fineCard: {
    backgroundColor: "#FFF4D6",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },

  fineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#765600",
  },

  fineText: {
    fontSize: 12,
    lineHeight: 19,
    color: "#604D20",
    marginTop: 5,
  },

  fineExample: {
    fontSize: 12,
    fontWeight: "800",
    color: "#604D20",
    marginTop: 5,
  },

  selectedInfo: {
    textAlign: "center",
    fontSize: 12,
    color: DARK,
    fontWeight: "700",
    marginTop: 16,
  },

  confirmButton: {
    backgroundColor: "#12B76A",
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },

  checkoutButton: {
    backgroundColor: GREEN,
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },

  confirmText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  footerText: {
    textAlign: "center",
    fontSize: 11,
    color: "#777777",
    marginTop: 13,
    marginBottom: 12,
  },

  bookingCard: {
    backgroundColor: WHITE,
    padding: 18,
    borderRadius: 16,
    elevation: 2,
  },

  successHeader: {
    alignItems: "center",
    marginBottom: 10,
  },

  successIcon: {
    backgroundColor: GREEN,
    color: WHITE,
    width: 45,
    height: 45,
    borderRadius: 25,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 27,
    overflow: "hidden",
    fontWeight: "900",
  },

  successTitle: {
    fontSize: 20,
    color: GREEN,
    fontWeight: "900",
    marginTop: 10,
  },

  bookingMessage: {
    color: "#777777",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 15,
  },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  receiptLabel: {
    color: "#777777",
    fontSize: 12,
  },

  receiptValue: {
    color: DARK,
    fontWeight: "800",
    fontSize: 12,
  },
});
