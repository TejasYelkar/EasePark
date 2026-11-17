
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
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
  fetchAdminUsers,
  type AdminBooking,
  type AdminUser,
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

type Vehicle = {
  id: string;
  number: string;
  type: string;
  parked: boolean;
  slot?: string;
  entryTime?: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  registrationDate: string;
  vehicles: Vehicle[];
};

type FilterType = 'All' | 'Active' | 'Inactive';

function formatRegistrationDate(date: string | null) {
  return date ? new Date(date).toLocaleDateString('en-IN') : 'Not provided';
}

function isBookingActive(booking: AdminBooking) {
  return booking.bookingStatus === 'APPROVED' && booking.checkedOutAt === null;
}

function isCustomerActive(customer: Customer) {
  return customer.vehicles.some(vehicle => vehicle.parked);
}

function MetricCard({
  title,
  value,
  icon,
  color,
  background,
}: {
  title: string;
  value: number | string;
  icon: IconName;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={27} color={color} />
      </View>

      <View style={styles.metricInfo}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
    </View>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: active ? '#DCFCE7' : '#E9EEF5',
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: active ? COLORS.green : '#94A3B8',
          },
        ]}
      />
      <Text
        style={[
          styles.statusText,
          {
            color: active ? '#15803D' : '#475569',
          },
        ]}
      >
        {active ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

function VehicleItem({ vehicle }: { vehicle: Vehicle }) {
  const icon: IconName =
    vehicle.type.toLowerCase() === 'bike'
      ? 'bicycle-outline'
      : 'car-outline';

  return (
    <View
      style={[
        styles.vehicleItem,
        {
          backgroundColor: vehicle.parked ? '#FFF7D6' : '#F1F5F9',
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={vehicle.parked ? COLORS.navy : COLORS.muted}
      />

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleNumber}>{vehicle.number}</Text>
        <Text
          style={[
            styles.vehicleStatus,
            {
              color: vehicle.parked ? COLORS.green : COLORS.muted,
            },
          ]}
        >
          {vehicle.parked
            ? `Parked (${vehicle.slot})`
            : 'Not Parked'}
        </Text>
      </View>
    </View>
  );
}

function CustomerCard({
  customer,
  onPress,
}: {
  customer: Customer;
  onPress: () => void;
}) {
  const active = isCustomerActive(customer);

  const parkedCount = customer.vehicles.filter(
    vehicle => vehicle.parked
  ).length;

  return (
    <View style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={styles.avatar}>
          <Ionicons
            name="person"
            size={30}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerSub}>
            {customer.id}  •  {customer.phone}
          </Text>
        </View>

        <StatusBadge active={active} />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.vehicleSummary}>
        <View style={styles.summaryItem}>
          <Ionicons
            name="car-outline"
            size={20}
            color={COLORS.navy}
          />
          <Text style={styles.summaryText}>
            {customer.vehicles.length} Vehicles
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Ionicons
            name="checkmark-circle"
            size={19}
            color={COLORS.green}
          />
          <Text style={[styles.summaryText, { color: COLORS.green }]}>
            {parkedCount} Parked
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Ionicons
            name="car-outline"
            size={19}
            color={COLORS.muted}
          />
          <Text style={styles.summaryText}>
            {customer.vehicles.length - parkedCount} Outside
          </Text>
        </View>
      </View>

      <View style={styles.vehicleList}>
        {customer.vehicles.slice(0, 2).map(vehicle => (
          <VehicleItem key={vehicle.id} vehicle={vehicle} />
        ))}
      </View>

      {customer.vehicles.length > 2 && (
        <Text style={styles.moreVehicles}>
          + {customer.vehicles.length - 2} more vehicles
        </Text>
      )}

      <Pressable
        style={styles.detailsButton}
        onPress={onPress}
      >
        <Text style={styles.detailsText}>View Details</Text>
        <Ionicons
          name="chevron-forward"
          size={19}
          color="#1677ED"
        />
      </Pressable>
    </View>
  );
}

export default function CustomerManagementScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      const [registeredUsers, registeredBookings] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminBookings(),
      ]);
      setUsers(registeredUsers);
      setBookings(registeredBookings);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => void loadCustomers(), 0);
    const interval = setInterval(() => void loadCustomers(), 15000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadCustomers]);

  const customers = useMemo<Customer[]>(() => users.map(user => {
    const userBookings = bookings.filter(booking => booking.userId === user.id);
    const activeBookings = userBookings.filter(isBookingActive);
    return {
      id: user.id,
      name: user.username,
      phone: user.phone,
      email: user.email,
      registrationDate: formatRegistrationDate(user.createdAt),
      vehicles: user.vehicles.map((vehicle, index) => {
        const normalizedNumber = vehicle.vehicleNumber.replace(/[\s-]/g, '').toUpperCase();
        const activeBooking = activeBookings.find(booking =>
          booking.vehicleNumber.replace(/[\s-]/g, '').toUpperCase() === normalizedNumber
        );
        return {
          id: `${user.id}-${index}`,
          number: vehicle.vehicleNumber,
          type: vehicle.vehicleType === '2 Wheeler' ? 'Bike' : 'Car',
          parked: activeBooking !== undefined,
          slot: activeBooking?.slotId,
          entryTime: activeBooking?.entryTime,
        };
      }),
    };
  }), [bookings, users]);

  const totalCustomers = customers.length;

  const activeCustomers = customers.filter(
    customer => isCustomerActive(customer)
  ).length;

  const inactiveCustomers = totalCustomers - activeCustomers;

  const parkedVehicles = customers.reduce(
    (total, customer) =>
      total +
      customer.vehicles.filter(vehicle => vehicle.parked).length,
    0
  );

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const active = isCustomerActive(customer);

      const matchesFilter =
        filter === 'All' ||
        (filter === 'Active' && active) ||
        (filter === 'Inactive' && !active);

      const query = search.toLowerCase().trim();

      const matchesSearch =
        customer.name.toLowerCase().includes(query) ||
        customer.id.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.vehicles.some(vehicle =>
          vehicle.number.toLowerCase().includes(query)
        );

      return matchesFilter && matchesSearch;
    });
  }, [customers, filter, search]);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Yellow SmartPark Header */}
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
                Admin Panel
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
                size={24}
                color={COLORS.black}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          {/* Page Heading with Back Button */}
          <View style={styles.pageHeading}>
            <Pressable
              onPress={onBack}
              style={styles.backButton}
              android_ripple={{ color: '#31558A', borderless: true }}
              accessibilityRole="button"
              accessibilityLabel="Go back to Dashboard"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={COLORS.white}
              />
            </Pressable>

            <View style={styles.headingIcon}>
              <Ionicons
                name="people-outline"
                size={30}
                color={COLORS.yellow}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.heading}>
                Customer Management
              </Text>
              <Text style={styles.welcome}>
                Monitor registered customers
              </Text>
            </View>
          </View>

          {/* Statistics */}
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Customers"
              value={loading ? '…' : loadError ? '—' : totalCustomers}
              icon="people-outline"
              color={COLORS.navy}
              background="#FFF7D6"
            />

            <MetricCard
              title="Parked Vehicles"
              value={loading ? '…' : loadError ? '—' : parkedVehicles}
              icon="car-outline"
              color={COLORS.green}
              background="#DDF5E9"
            />

            <MetricCard
              title="Active Customers"
              value={loading ? '…' : loadError ? '—' : activeCustomers}
              icon="checkmark-circle-outline"
              color={COLORS.green}
              background="#DDF5E9"
            />

            <MetricCard
              title="Inactive Customers"
              value={loading ? '…' : loadError ? '—' : inactiveCustomers}
              icon="remove-circle-outline"
              color={COLORS.muted}
              background="#E9EEF5"
            />
          </View>
          {loadError && (
            <Pressable
              style={styles.emptyState}
              onPress={() => void loadCustomers()}
              accessibilityRole="button"
            >
              <Text style={styles.emptyTitle}>Could Not Load Customers</Text>
              <Text style={styles.emptySubtitle}>{loadError}. Tap to retry.</Text>
            </Pressable>
          )}

          {/* Search */}
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={23}
              color={COLORS.navy}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search name, ID, phone or vehicle..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons
                  name="close-circle"
                  size={21}
                  color={COLORS.muted}
                />
              </Pressable>
            )}
          </View>

          {/* Filters */}
          <View style={styles.filterRow}>
            {(['All', 'Active', 'Inactive'] as FilterType[]).map(
              item => (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterButton,
                    filter === item && styles.selectedFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item && styles.selectedFilterText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* Customer Directory */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Customer Directory
            </Text>
            <Text style={styles.recordCount}>
              {filteredCustomers.length} Records
            </Text>
          </View>

          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onPress={() => setSelectedCustomer(customer)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={45}
                color="#94A3B8"
              />
              <Text style={styles.emptyTitle}>
                {loading ? 'Loading Customers…' : 'No Customers Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {loading ? 'Loading registered accounts.' : 'Try changing your search or filter.'}
              </Text>
            </View>
          )}

          <Text style={styles.footer}>
            SmartPark Admin Panel
          </Text>
        </View>
      </ScrollView>

      {/* Customer Details Modal */}
      <Modal
        visible={selectedCustomer !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCustomer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Customer Details
              </Text>

              <Pressable
                onPress={() => setSelectedCustomer(null)}
              >
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={COLORS.muted}
                />
              </Pressable>
            </View>

            {selectedCustomer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalProfile}>
                  <View style={styles.avatarLarge}>
                    <Ionicons
                      name="person"
                      size={36}
                      color={COLORS.navy}
                    />
                  </View>

                  <Text style={styles.modalCustomerName}>
                    {selectedCustomer.name}
                  </Text>

                  <Text style={styles.modalCustomerId}>
                    {selectedCustomer.id}
                  </Text>

                  <StatusBadge
                    active={isCustomerActive(selectedCustomer)}
                  />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>
                    CONTACT INFORMATION
                  </Text>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color={COLORS.navy}
                    />
                    <Text style={styles.detailValue}>
                      {selectedCustomer.phone}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={COLORS.navy}
                    />
                    <Text style={styles.detailValue}>
                      {selectedCustomer.email}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={COLORS.navy}
                    />
                    <Text style={styles.detailValue}>
                      Registered: {selectedCustomer.registrationDate}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>
                    REGISTERED VEHICLES (
                    {selectedCustomer.vehicles.length})
                  </Text>

                  {selectedCustomer.vehicles.map(vehicle => (
                    <View
                      key={vehicle.id}
                      style={styles.modalVehicle}
                    >
                      <View style={styles.detailRow}>
                        <Ionicons
                          name={
                            vehicle.type.toLowerCase() === 'bike'
                              ? 'bicycle-outline'
                              : 'car-outline'
                          }
                          size={23}
                          color={COLORS.navy}
                        />

                        <View style={{ flex: 1 }}>
                          <Text style={styles.vehicleNumber}>
                            {vehicle.number}
                          </Text>
                          <Text style={styles.vehicleStatus}>
                            {vehicle.type}
                          </Text>
                        </View>

                        <StatusBadge active={vehicle.parked} />
                      </View>

                      {vehicle.parked && (
                        <View style={styles.parkingInfo}>
                          <Text style={styles.parkingInfoText}>
                            Slot: {vehicle.slot}
                          </Text>
                          <Text style={styles.parkingInfoText}>
                            Entry: {vehicle.entryTime}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                <Pressable
                  style={styles.closeButton}
                  onPress={() => setSelectedCustomer(null)}
                >
                  <Text style={styles.closeButtonText}>
                    Close Details
                  </Text>
                </Pressable>
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
    paddingTop: 22,
  },

  pageHeading: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 18,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#173D78',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  headingIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#173D78',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heading: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '800',
  },

  welcome: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 4,
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
    padding: 11,
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
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricInfo: {
    flex: 1,
  },

  metricValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },

  metricTitle: {
    color: COLORS.text,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },

  searchBox: {
    marginTop: 20,
    height: 53,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 8,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 17,
  },

  filterButton: {
    paddingHorizontal: 21,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
    alignItems: 'center',
  },

  selectedFilter: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },

  filterText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  selectedFilterText: {
    color: COLORS.black,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
  },

  recordCount: {
    fontSize: 11,
    color: COLORS.muted,
  },

  customerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
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

  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    width: 49,
    height: 49,
    borderRadius: 30,
    backgroundColor: '#E2EAF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  customerSub: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },

  vehicleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 12,
  },

  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  summaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },

  vehicleList: {
    gap: 7,
  },

  vehicleItem: {
    borderRadius: 12,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  vehicleInfo: {
    flex: 1,
  },

  vehicleNumber: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },

  vehicleStatus: {
    fontSize: 11,
    marginTop: 3,
    color: COLORS.muted,
  },

  moreVehicles: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 9,
    marginLeft: 3,
  },

  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },

  detailsText: {
    color: '#1677ED',
    fontSize: 13,
    fontWeight: '700',
  },

  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 5,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },

  emptySubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },

  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 20,
    marginBottom: 10,
  },

  // Details Modal

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  modalProfile: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },

  avatarLarge: {
    width: 65,
    height: 65,
    borderRadius: 40,
    backgroundColor: '#E2EAF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCustomerName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
  },

  modalCustomerId: {
    fontSize: 12,
    color: COLORS.muted,
  },

  detailSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 17,
    marginBottom: 18,
    gap: 13,
  },

  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    flex: 1,
  },

  modalVehicle: {
    backgroundColor: '#F5F7FC',
    borderRadius: 13,
    padding: 12,
    gap: 10,
  },

  parkingInfo: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  parkingInfoText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '600',
  },

  closeButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 13,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },

  closeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
