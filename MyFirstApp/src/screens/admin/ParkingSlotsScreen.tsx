import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useParkingSlots } from '@/hooks/use-parking-slots';
import {
  updateParkingSlotStatus,
  type ParkingSlotStatus,
} from '@/services/parking-slots';

type IconName = keyof typeof Ionicons.glyphMap;

type SlotStatus =
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Maintenance';

type VehicleType = 'Two-Wheeler' | 'Four-Wheeler';

type ParkingSlot = {
  id: string;
  status: SlotStatus;
  vehicle?: string;
  booking?: string;
};

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

const STATUS_COLORS = {
  Available: {
    color: COLORS.green,
    background: '#DDF5E9',
    border: '#B8E5CC',
  },
  Occupied: {
    color: COLORS.red,
    background: '#FFE4E4',
    border: '#FFC1C1',
  },
  Reserved: {
    color: COLORS.orange,
    background: '#FFF0DB',
    border: '#F7D7A6',
  },
  Maintenance: {
    color: '#667085',
    background: '#EAECF0',
    border: '#D0D5DD',
  },
};

const FLOOR_NAMES = ['Floor 1', 'Floor 2', 'Floor 3'];

const ZONE_NAMES = ['Zone 1', 'Zone 2', 'Zone 3'];

function getDisplayStatus(status: ParkingSlotStatus): SlotStatus {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'OCCUPIED':
      return 'Occupied';
    case 'RESERVED':
      return 'Reserved';
    case 'MAINTENANCE':
      return 'Maintenance';
  }
}

function Header({ onBack }: { onBack: () => void }) {
  return (
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
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  background,
}: {
  title: string;
  value: number;
  icon: IconName;
  color: string;
  background: string;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: background },
      ]}
    >
      <Ionicons
        name={icon}
        size={27}
        color={color}
      />

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statTitle}>
        {title}
      </Text>
    </View>
  );
}

function ParkingSlotCard({
  slot,
  selected,
  onPress,
}: {
  slot: ParkingSlot;
  selected: boolean;
  onPress: () => void;
}) {
  const statusStyle = STATUS_COLORS[slot.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.slotCard,
        {
          backgroundColor: statusStyle.background,
          borderColor: selected
            ? COLORS.navy
            : statusStyle.border,
          borderWidth: selected ? 2 : 1,
        },
        pressed && styles.pressedCard,
      ]}
    >
      <Text style={styles.slotId}>
        {slot.id}
      </Text>

      <View style={styles.slotStatusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: statusStyle.color },
          ]}
        />

        <Text
          style={[
            styles.slotStatus,
            { color: statusStyle.color },
          ]}
          numberOfLines={1}
        >
          {slot.status}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ParkingSlotsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [vehicleType, setVehicleType] =
    useState<VehicleType>('Two-Wheeler');

  const [selectedFloor, setSelectedFloor] =
    useState(0);

  const [selectedSlot, setSelectedSlot] =
    useState<ParkingSlot | null>(null);
  const [updatingSlot, setUpdatingSlot] = useState(false);
  const [slotActionError, setSlotActionError] = useState<string | null>(null);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);

  const {
    slots: backendSlots,
    isLoading,
    error,
    refresh,
    updateSlotStatus,
  } = useParkingSlots(
    selectedFloor + 1,
    vehicleType === 'Two-Wheeler' ? 'BIKE' : 'CAR'
  );
  const slots = useMemo<ParkingSlot[]>(
    () => backendSlots.map(slot => ({
      id: slot.slotNumber,
      status: getDisplayStatus(slot.status),
    })),
    [backendSlots]
  );

  const statistics = useMemo(() => {
    return {
      available: slots.filter(
        slot => slot.status === 'Available'
      ).length,

      occupied: slots.filter(
        slot => slot.status === 'Occupied'
      ).length,

      reserved: slots.filter(
        slot => slot.status === 'Reserved'
      ).length,

      total: slots.length,

      maintenance: slots.filter(
        slot => slot.status === 'Maintenance'
      ).length,
    };
  }, [slots]);

  const changeVehicleType = (type: VehicleType) => {
    setVehicleType(type);
    setSelectedFloor(0);
    setSelectedSlot(null);
  };

  const changeFloor = (index: number) => {
    setSelectedFloor(index);
    setSelectedSlot(null);
  };

  const currentFloorName =
    vehicleType === 'Two-Wheeler'
      ? FLOOR_NAMES[selectedFloor]
      : ZONE_NAMES[selectedFloor];

  const selectedSlotDetails = selectedSlot
    ? slots.find(slot => slot.id === selectedSlot.id)
    : null;

  const changeSelectedSlotStatus = async (status: 'AVAILABLE' | 'MAINTENANCE') => {
    if (!selectedSlotDetails || updatingSlot) return;
    setUpdatingSlot(true);
    setSlotActionError(null);
    try {
      await updateParkingSlotStatus(selectedSlotDetails.id, status);
      updateSlotStatus(selectedSlotDetails.id, status);
    } catch (error) {
      setSlotActionError(
        error instanceof Error ? error.message : 'Could not update this slot.'
      );
    } finally {
      setUpdatingSlot(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      >
        <Header onBack={onBack} />

        <View style={styles.content}>

          {/* Page Heading */}

          <View style={styles.headingRow}>
            <View style={styles.headingIcon}>
              <Ionicons
                name="car-outline"
                size={30}
                color={COLORS.white}
              />
            </View>

            <View style={styles.headingInfo}>
              <Text style={styles.heading}>
                Parking Slots
              </Text>

              <Text style={styles.subtitle}>
                View and manage all parking slots
              </Text>
            </View>
          </View>

          {/* Parking Statistics */}

          <View style={styles.statsGrid}>
            <StatCard
              title="Available"
              value={statistics.available}
              icon="checkmark-circle"
              color={COLORS.green}
              background="#DDF5E9"
            />

            <StatCard
              title="Occupied"
              value={statistics.occupied}
              icon="car"
              color={COLORS.red}
              background="#FFE4E4"
            />

            <StatCard
              title="Reserved"
              value={statistics.reserved}
              icon="time"
              color={COLORS.orange}
              background="#FFF0DB"
            />

            <StatCard
              title="Total Slots"
              value={statistics.total}
              icon="grid"
              color={COLORS.navy}
              background="#E8EFF9"
            />

            <StatCard
              title="Maintenance"
              value={statistics.maintenance}
              icon="construct"
              color="#667085"
              background="#EAECF0"
            />
          </View>

          {/* Vehicle Selection */}

          <View style={styles.vehicleRow}>
            <Pressable
              onPress={() =>
                changeVehicleType('Two-Wheeler')
              }
              style={[
                styles.vehicleButton,
                vehicleType === 'Two-Wheeler' &&
                  styles.activeVehicleButton,
              ]}
            >
              <Ionicons
                name="bicycle"
                size={25}
                color={
                  vehicleType === 'Two-Wheeler'
                    ? COLORS.white
                    : COLORS.navy
                }
              />

              <Text
                style={[
                  styles.vehicleText,
                  vehicleType === 'Two-Wheeler' &&
                    styles.activeVehicleText,
                ]}
              >
                Two-Wheeler
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                changeVehicleType('Four-Wheeler')
              }
              style={[
                styles.vehicleButton,
                vehicleType === 'Four-Wheeler' &&
                  styles.activeVehicleButton,
              ]}
            >
              <Ionicons
                name="car-sport"
                size={25}
                color={
                  vehicleType === 'Four-Wheeler'
                    ? COLORS.white
                    : COLORS.navy
                }
              />

              <Text
                style={[
                  styles.vehicleText,
                  vehicleType === 'Four-Wheeler' &&
                    styles.activeVehicleText,
                ]}
              >
                Four-Wheeler
              </Text>
            </Pressable>
          </View>

          {/* Floor / Zone Selection */}

          <View style={styles.floorSection}>
            <View style={styles.floorHeading}>
              <Ionicons
                name="layers"
                size={25}
                color={COLORS.navy}
              />

              <Text style={styles.floorLabel}>
                Select {vehicleType === 'Two-Wheeler' ? 'Floor' : 'Zone'}:
              </Text>
            </View>

            <View style={styles.floorRow}>
              {[0, 1, 2].map(index => (
                <Pressable
                  key={index}
                  onPress={() => changeFloor(index)}
                  style={[
                    styles.floorButton,
                    selectedFloor === index &&
                      styles.activeFloorButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.floorText,
                      selectedFloor === index &&
                        styles.activeFloorText,
                    ]}
                  >
                    {vehicleType === 'Two-Wheeler'
                      ? `Floor ${index + 1}`
                      : `Zone ${index + 1}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Parking Slot Grid */}

          <View style={styles.slotSection}>
            <View style={styles.slotSectionHeader}>
              <View style={styles.slotSectionTitle}>
                <Ionicons
                  name="grid"
                  size={23}
                  color={COLORS.navy}
                />

                <Text style={styles.sectionTitle}>
                  {currentFloorName} Slots
                </Text>
              </View>

              <Text style={styles.totalSlots}>
                {slots.length} Slots
              </Text>
            </View>

            {error ? (
              <View style={styles.slotsMessage}>
                <Text style={styles.slotsMessageText}>{error}</Text>
                <Pressable onPress={refresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : isLoading && slots.length === 0 ? (
              <View style={styles.slotsMessage}>
                <ActivityIndicator color={COLORS.navy} />
                <Text style={styles.slotsMessageText}>Loading parking slots…</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.slotsMessage}>
                <Text style={styles.slotsMessageText}>
                  No slots were found for this vehicle type and floor.
                </Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map(slot => (
                  <ParkingSlotCard
                    key={slot.id}
                    slot={slot}
                    selected={selectedSlot?.id === slot.id}
                    onPress={() => setSelectedSlot(slot)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Slot Details */}

          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <Ionicons
                name="information-circle"
                size={32}
                color={COLORS.navy}
              />

              <Text style={styles.detailsTitle}>
                Slot Details
              </Text>
            </View>

            {selectedSlotDetails ? (
              <View style={styles.detailsContent}>
                <Text style={styles.detailText}>
                  Slot ID: {selectedSlotDetails.id}
                </Text>

                <Text style={styles.detailText}>
                  Status: {selectedSlotDetails.status}
                </Text>

                {selectedSlotDetails.vehicle && (
                  <Text style={styles.detailText}>
                    Vehicle: {selectedSlotDetails.vehicle}
                  </Text>
                )}

                {selectedSlotDetails.booking && (
                  <Text style={styles.detailText}>
                    Booking: {selectedSlotDetails.booking}
                  </Text>
                )}
                {slotActionError && (
                  <Text style={styles.slotActionError}>{slotActionError}</Text>
                )}
                {(selectedSlotDetails.status === 'Available' ||
                  selectedSlotDetails.status === 'Maintenance') && (
                  <Pressable
                    disabled={updatingSlot}
                    style={styles.slotActionButton}
                    onPress={() => {
                      const status =
                        selectedSlotDetails.status === 'Maintenance'
                          ? 'AVAILABLE'
                          : 'MAINTENANCE';
                      if (status === 'MAINTENANCE') {
                        setConfirmMaintenance(true);
                      } else {
                        void changeSelectedSlotStatus(status);
                      }
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.slotActionText}>
                      {updatingSlot
                        ? 'Updating…'
                        : selectedSlotDetails.status === 'Maintenance'
                          ? 'Make Available'
                          : 'Mark for Maintenance'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Text style={styles.detailsSubtitle}>
                Select any slot to view vehicle and booking details
              </Text>
            )}
          </View>

          <Text style={styles.footer}>
            SmartPark Admin Panel
          </Text>

        </View>
      </ScrollView>

      <Modal
        visible={confirmMaintenance}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmMaintenance(false)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Mark slot for maintenance?</Text>
            <Text style={styles.confirmMessage}>
              {selectedSlotDetails?.id} will be unavailable for new bookings.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setConfirmMaintenance(false)}
                accessibilityRole="button"
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmButton}
                disabled={updatingSlot}
                onPress={() => {
                  setConfirmMaintenance(false);
                  void changeSelectedSlotStatus('MAINTENANCE');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.confirmButtonText}>
                  {updatingSlot ? 'Updating…' : 'Confirm'}
                </Text>
              </Pressable>
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
    paddingTop: 24,
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },

  headingIcon: {
    width: 53,
    height: 53,
    backgroundColor: COLORS.navy,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headingInfo: {
    flex: 1,
  },

  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },

  statCard: {
    width: '48.5%',
    minHeight: 91,
    borderRadius: 17,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },

  statTitle: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
  },

  vehicleRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 22,
  },

  vehicleButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1.3,
    borderColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 5,
  },

  activeVehicleButton: {
    backgroundColor: COLORS.navy,
  },

  vehicleText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '700',
  },

  activeVehicleText: {
    color: COLORS.white,
  },

  floorSection: {
    marginTop: 22,
    marginBottom: 18,
  },

  floorHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  floorLabel: {
    fontSize: 15,
    color: COLORS.navy,
    fontWeight: '700',
  },

  floorRow: {
    flexDirection: 'row',
    gap: 8,
  },

  floorButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 25,
    borderWidth: 1.2,
    borderColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },

  activeFloorButton: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },

  floorText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '700',
  },

  activeFloorText: {
    color: COLORS.black,
  },

  slotSection: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  slotSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  slotSectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
  },

  totalSlots: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },

  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  slotsMessage: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  slotsMessageText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  slotCard: {
    width: '24%',
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingVertical: 7,
  },

  slotId: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '800',
  },

  slotStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
  },

  slotStatus: {
    fontSize: 9,
    fontWeight: '700',
  },

  pressedCard: {
    opacity: 0.7,
  },

  detailsCard: {
    marginTop: 19,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D4DCF1',
    padding: 15,
  },

  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  detailsTitle: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '800',
  },

  detailsSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 7,
    marginLeft: 41,
    lineHeight: 19,
  },

  detailsContent: {
    marginTop: 10,
    marginLeft: 41,
    gap: 6,
  },

  detailText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  slotActionButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
  },
  slotActionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  slotActionError: {
    color: COLORS.red,
    fontSize: 13,
    marginTop: 8,
  },

  confirmBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  confirmTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  confirmMessage: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  confirmCancelButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#F1F4F9',
  },
  confirmCancelText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 17,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 22,
  },
});