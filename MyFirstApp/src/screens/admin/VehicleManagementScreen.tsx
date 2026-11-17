
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  StatusBar,
  Modal,
  Alert,
  FlatList,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { fetchAdminUsers } from '@/services/parking-bookings';

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

type VehicleStatus = 'Active' | 'Pending' | 'Inactive';

type Vehicle = {
  id: string;
  registrationNumber: string;
  ownerName: string;
  mobileNumber: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleColor: string;
  registrationDate: string;
  status: VehicleStatus;
};

const VEHICLE_FILTERS = [
  'All',
  'Two Wheeler',
  'Four Wheeler',
  'Electric Vehicle',
];

type VehicleForm = Omit<Vehicle, 'id' | 'status'> & {
  status: VehicleStatus | '';
};

const EMPTY_FORM: VehicleForm = {
  registrationNumber: '',
  ownerName: '',
  mobileNumber: '',
  vehicleType: '',
  vehicleModel: '',
  vehicleColor: '',
  registrationDate: '',
  status: '',
};

function StatusBadge({ status }: { status: VehicleStatus }) {
  const background =
    status === 'Active'
      ? '#DDF5E9'
      : status === 'Pending'
        ? '#FFF0DB'
        : '#FFE4E4';

  const color =
    status === 'Active'
      ? COLORS.green
      : status === 'Pending'
        ? COLORS.orange
        : COLORS.red;

  return (
    <View style={[styles.statusBadge, { backgroundColor: background }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  background,
}: {
  title: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
  );
}

export default function VehicleManagementScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadVehicles = useCallback(async () => {
    try {
      const users = await fetchAdminUsers();
      setVehicles(users.flatMap(user =>
        user.vehicles.map((vehicle, index) => ({
          id: `${user.id}-${index}`,
          registrationNumber: vehicle.vehicleNumber,
          ownerName: user.username,
          mobileNumber: user.phone,
          vehicleType: vehicle.vehicleType === '2 Wheeler' ? 'Two Wheeler' : 'Four Wheeler',
          vehicleModel: '',
          vehicleColor: '',
          registrationDate: user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('en-IN')
            : '',
          status: 'Active',
        }))
      ));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load vehicles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => void loadVehicles(), 0);
    return () => clearTimeout(initialLoad);
  }, [loadVehicles]);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(
    (vehicle) => vehicle.status === 'Active'
  ).length;
  const pendingVehicles = vehicles.filter(
    (vehicle) => vehicle.status === 'Pending'
  ).length;
  const inactiveVehicles = vehicles.filter(
    (vehicle) => vehicle.status === 'Inactive'
  ).length;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        vehicle.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        vehicle.mobileNumber.includes(search);

      const matchesFilter =
        selectedFilter === 'All' ||
        vehicle.vehicleType === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [vehicles, search, selectedFilter]);

function updateForm<K extends keyof VehicleForm>(
  key: K,
  value: VehicleForm[K]
) {
  setForm((previous) => ({ ...previous, [key]: value }));
}

  function openAddForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  }

  function openEditForm(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setForm({
      registrationNumber: vehicle.registrationNumber,
      ownerName: vehicle.ownerName,
      mobileNumber: vehicle.mobileNumber,
      vehicleType: vehicle.vehicleType,
      vehicleModel: vehicle.vehicleModel,
      vehicleColor: vehicle.vehicleColor,
      registrationDate: vehicle.registrationDate,
      status: vehicle.status,
    });
    setModalVisible(true);
  }

  function saveVehicle() {
    if (
      !form.registrationNumber.trim() ||
      !form.ownerName.trim() ||
      !form.mobileNumber.trim() ||
      !form.vehicleModel.trim() ||
      !form.vehicleType ||
      !form.status
    ) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (!/^[0-9]{10}$/.test(form.mobileNumber.trim())) {
      Alert.alert('Invalid Mobile Number', 'Enter a valid 10-digit mobile number.');
      return;
    }

    const normalizedNumber = form.registrationNumber.trim().toUpperCase();

    const duplicate = vehicles.some(
      (vehicle) =>
        vehicle.registrationNumber.toUpperCase() === normalizedNumber &&
        vehicle.id !== editingId
    );

    if (duplicate) {
      Alert.alert(
        'Vehicle Already Exists',
        'This registration number is already registered.'
      );
      return;
    }

    const vehicleData: Vehicle = {
      id: editingId ?? Date.now().toString(),
      registrationNumber: normalizedNumber,
      ownerName: form.ownerName.trim(),
      mobileNumber: form.mobileNumber.trim(),
      vehicleType: form.vehicleType,
      vehicleModel: form.vehicleModel.trim(),
      vehicleColor: form.vehicleColor.trim(),
      registrationDate: form.registrationDate.trim(),
      status: form.status,
    };

    if (editingId) {
      setVehicles((previous) =>
        previous.map((vehicle) =>
          vehicle.id === editingId ? vehicleData : vehicle
        )
      );
      Alert.alert('Success', 'Vehicle updated successfully.');
    } else {
      setVehicles((previous) => [vehicleData, ...previous]);
      Alert.alert('Success', 'Vehicle added successfully.');
    }

    setModalVisible(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function deleteVehicle(vehicle: Vehicle) {
    Alert.alert(
      'Delete Vehicle?',
      `Are you sure you want to delete ${vehicle.registrationNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setVehicles((previous) =>
              previous.filter((item) => item.id !== vehicle.id)
            );
          },
        },
      ]
    );
  }

  function viewVehicle(vehicle: Vehicle) {
    Alert.alert(
      'Vehicle Details',
      `Registration: ${vehicle.registrationNumber}\n\nOwner: ${vehicle.ownerName}\n\nMobile: ${vehicle.mobileNumber}\n\nType: ${vehicle.vehicleType}\n\nModel: ${vehicle.vehicleModel}\n\nColor: ${vehicle.vehicleColor}\n\nRegistration Date: ${vehicle.registrationDate}\n\nStatus: ${vehicle.status}`,
      [{ text: 'Close' }]
    );
  }

  function renderVehicle({ item }: { item: Vehicle }) {
    return (
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleTopRow}>
          <View style={styles.vehicleIcon}>
            <Ionicons
              name={
                item.vehicleType === 'Two Wheeler'
                  ? 'bicycle-outline'
                  : 'car-sport-outline'
              }
              size={29}
              color={COLORS.navy}
            />
          </View>

          <View style={styles.vehicleInfo}>
            <Text style={styles.registrationNumber}>
              {item.registrationNumber}
            </Text>
            <Text style={styles.ownerName}>{item.ownerName}</Text>
            <Text style={styles.vehicleModel}>
              {item.vehicleType} · {item.vehicleModel}
            </Text>
          </View>

          <StatusBadge status={item.status} />
        </View>

        <View style={styles.vehicleDivider} />

        <View style={styles.vehicleActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => viewVehicle(item)}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.navy} />
            <Text style={styles.viewAction}>View</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => openEditForm(item)}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.navy} />
            <Text style={styles.viewAction}>Edit</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => deleteVehicle(item)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.red} />
            <Text style={styles.deleteAction}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SAME HEADER AS DASHBOARD */}
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
              <Text style={styles.brandSubtitle}>Admin Dashboard</Text>
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

        <View style={styles.content}>
          <Text style={styles.heading}>Vehicle Management</Text>
          <Text style={styles.subtitle}>Manage all registered vehicles</Text>

          {/* SUMMARY CARDS */}
          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Total Vehicles"
              value={loading ? '…' : loadError ? '—' : totalVehicles}
              icon="car-outline"
              color={COLORS.navy}
              background="#E8EEFA"
            />
            <SummaryCard
              title="Active Vehicles"
              value={loading ? '…' : loadError ? '—' : activeVehicles}
              icon="checkmark-circle-outline"
              color={COLORS.green}
              background="#DDF5E9"
            />
            <SummaryCard
              title="Pending"
              value={loading ? '…' : loadError ? '—' : pendingVehicles}
              icon="time-outline"
              color={COLORS.orange}
              background="#FFF0DB"
            />
            <SummaryCard
              title="Inactive"
              value={loading ? '…' : loadError ? '—' : inactiveVehicles}
              icon="close-circle-outline"
              color={COLORS.red}
              background="#FFE4E4"
            />
          </View>
          {loadError && (
            <Pressable
              style={styles.emptyState}
              onPress={() => void loadVehicles()}
              accessibilityRole="button"
            >
              <Text style={styles.emptyTitle}>Could Not Load Vehicles</Text>
              <Text style={styles.emptySubtitle}>{loadError}. Tap to retry.</Text>
            </Pressable>
          )}

          {/* SEARCH */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={21} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search registration, owner or mobile..."
              placeholderTextColor={COLORS.muted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.muted} />
              </Pressable>
            )}
          </View>

          {/* VEHICLE TYPE FILTER */}
          <Text style={styles.filterHeading}>Vehicle Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {VEHICLE_FILTERS.map((filter) => {
              const selected = selectedFilter === filter;

              return (
                <Pressable
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={[
                    styles.filterChip,
                    selected && styles.selectedFilterChip,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.selectedFilterText,
                    ]}
                  >
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* VEHICLE LIST HEADER */}
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Registered Vehicles</Text>
            <Text style={styles.resultCount}>
              {filteredVehicles.length} records
            </Text>
          </View>

          <FlatList
            data={filteredVehicles}
            keyExtractor={(item) => item.id}
            renderItem={renderVehicle}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="car-outline"
                  size={45}
                  color={COLORS.muted}
                />
                <Text style={styles.emptyTitle}>
                  {loading ? 'Loading Vehicles…' : 'No Vehicles Found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {loading ? 'Loading registered vehicles.' : 'Try another search or add a new vehicle.'}
                </Text>
              </View>
            }
          />

          {/* ADD VEHICLE BUTTON */}
          <Pressable
            style={styles.addButton}
            onPress={openAddForm}
          >
            <Ionicons name="add-circle-outline" size={23} color={COLORS.black} />
            <Text style={styles.addButtonText}>Add New Vehicle</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>SmartPark Admin Panel</Text>
      </ScrollView>

      {/* ADD / EDIT VEHICLE MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Edit Vehicle' : 'Add New Vehicle'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Enter vehicle information
                </Text>
              </View>

              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={29} color={COLORS.muted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>
                Registration Number *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MH 02 AB 1234"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="characters"
                value={form.registrationNumber}
                onChangeText={(value) =>
                  updateForm('registrationNumber', value)
                }
              />

              <Text style={styles.inputLabel}>Owner Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter owner name"
                placeholderTextColor={COLORS.muted}
                value={form.ownerName}
                onChangeText={(value) => updateForm('ownerName', value)}
              />

              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={COLORS.muted}
                keyboardType="phone-pad"
                maxLength={10}
                value={form.mobileNumber}
                onChangeText={(value) => updateForm('mobileNumber', value)}
              />

              <Text style={styles.inputLabel}>Vehicle Type *</Text>
              <View style={styles.optionGroup}>
                {['Two Wheeler', 'Four Wheeler', 'Electric Vehicle', 'Other'].map(
                  (type) => (
                    <Pressable
                      key={type}
                      onPress={() => updateForm('vehicleType', type)}
                      style={[
                        styles.optionChip,
                        form.vehicleType === type && styles.selectedOption,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          form.vehicleType === type && styles.selectedOptionText,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>Vehicle Model *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hyundai Creta"
                placeholderTextColor={COLORS.muted}
                value={form.vehicleModel}
                onChangeText={(value) => updateForm('vehicleModel', value)}
              />

              <Text style={styles.inputLabel}>Vehicle Color</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. White"
                placeholderTextColor={COLORS.muted}
                value={form.vehicleColor}
                onChangeText={(value) => updateForm('vehicleColor', value)}
              />

              <Text style={styles.inputLabel}>Registration Date</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 15 Jan 2024"
                placeholderTextColor={COLORS.muted}
                value={form.registrationDate}
                onChangeText={(value) =>
                  updateForm('registrationDate', value)
                }
              />

              <Text style={styles.inputLabel}>Vehicle Status</Text>
              <View style={styles.optionGroup}>
                {(['Active', 'Pending', 'Inactive'] as VehicleStatus[]).map(
                  (status) => (
                    <Pressable
                      key={status}
                      onPress={() => updateForm('status', status)}
                      style={[
                        styles.statusOption,
                        form.status === status && styles.selectedStatusOption,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          form.status === status && styles.selectedStatusText,
                        ]}
                      >
                        {status}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Pressable style={styles.saveButton} onPress={saveVehicle}>
                <Ionicons
                  name="save-outline"
                  size={21}
                  color={COLORS.black}
                />
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update Vehicle' : 'Save Vehicle'}
                </Text>
              </Pressable>

              <View style={{ height: 25 }} />
            </ScrollView>
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

  // SAME DASHBOARD HEADER
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

  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
    marginBottom: 18,
  },

  // SUMMARY
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  summaryCard: {
    width: '48.5%',
    minHeight: 112,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },

  summaryIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 5,
  },

  summaryTitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },

  // SEARCH
  searchContainer: {
    marginTop: 19,
    height: 51,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },

  // FILTERS
  filterHeading: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 19,
    marginBottom: 10,
  },

  filterContainer: {
    gap: 8,
    paddingBottom: 4,
  },

  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  selectedFilterChip: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  filterText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },

  selectedFilterText: {
    color: COLORS.white,
  },

  // VEHICLE LIST
  listHeader: {
    marginTop: 23,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },

  resultCount: {
    color: COLORS.muted,
    fontSize: 12,
  },

  vehicleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  vehicleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  vehicleIcon: {
    width: 53,
    height: 53,
    borderRadius: 13,
    backgroundColor: '#E8EEFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  vehicleInfo: {
    flex: 1,
  },

  registrationNumber: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },

  ownerName: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  vehicleModel: {
    color: COLORS.navy,
    fontSize: 11,
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 18,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  vehicleDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  vehicleActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
  },

  viewAction: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '600',
  },

  deleteAction: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '600',
  },

  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },

  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },

  // ADD BUTTON
  addButton: {
    marginTop: 8,
    backgroundColor: COLORS.yellow,
    minHeight: 53,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    elevation: 2,
  },

  addButtonText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: '800',
  },

  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 25,
    marginBottom: 10,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 19,
    paddingTop: 22,
    paddingBottom: 10,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 19,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },

  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  inputLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 13,
  },

  input: {
    backgroundColor: COLORS.white,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    color: COLORS.text,
    fontSize: 13,
  },

  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  selectedOption: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  optionText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },

  selectedOptionText: {
    color: COLORS.white,
  },

  statusOption: {
    flex: 1,
    minWidth: '28%',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  selectedStatusOption: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },

  statusOptionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },

  selectedStatusText: {
    color: COLORS.black,
  },

  saveButton: {
    marginTop: 24,
    height: 52,
    backgroundColor: COLORS.yellow,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  saveButtonText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: '800',
  },
});
