import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from '@e965/xlsx';

import type { AdminBooking, AdminUser } from './parking-bookings';
import type { ParkingSlot } from './parking-slots';

export type AdminExportRange = {
  startDate: string;
  endDate: string;
};

export type AdminReportSelection = {
  summary: boolean;
  bookings: boolean;
  users: boolean;
  vehicles: boolean;
  parkingSlots: boolean;
  payments: boolean;
  fines: boolean;
};

const BOOKING_HEADERS = [
  'Booking ID',
  'User',
  'Email',
  'Vehicle Type',
  'Vehicle Number',
  'Slot ID',
  'Floor',
  'Parking Date',
  'Entry Time',
  'Planned Exit',
  'Status',
  'Estimated Parking Charge (INR)',
  'Fine (INR)',
  'Total Due (INR)',
  'Payment Status',
  'Payment Method',
  'Payment Amount (INR)',
  'Paid At',
  'Checked Out At',
];

const USER_HEADERS = [
  'User ID',
  'Name',
  'Email',
  'Phone',
  'Vehicles',
  'Registered At',
];

const VEHICLE_HEADERS = [
  'User ID',
  'Name',
  'Email',
  'Vehicle Type',
  'Vehicle Number',
  'Registered At',
];

const PARKING_SLOT_HEADERS = [
  'Slot ID',
  'Floor',
  'Vehicle Type',
  'Status',
  'As Of Date',
];

const FINE_HEADERS = [
  'Booking ID',
  'User',
  'Email',
  'Vehicle Number',
  'Vehicle Type',
  'Parking Date',
  'Fine (INR)',
  'Payment Status',
  'Payment Method',
  'Fine Collected (INR)',
];

function isInRange(value: string | null, range: AdminExportRange): boolean {
  if (!value) return false;
  const date = value.slice(0, 10);
  return date >= range.startDate && date <= range.endDate;
}

function bookingDate(booking: AdminBooking): string {
  return booking.parkingDate;
}

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function financialDate(booking: AdminBooking): string | null {
  return booking.paidAt ?? booking.checkedOutAt ?? booking.parkingDate;
}

function bookingRows(bookings: AdminBooking[]) {
  return bookings.map(booking => ({
    'Booking ID': booking.id,
    User: booking.username,
    Email: booking.userEmail,
    'Vehicle Type': booking.vehicleType,
    'Vehicle Number': booking.vehicleNumber,
    'Slot ID': booking.slotId,
    Floor: booking.floorNumber,
    'Parking Date': booking.parkingDate,
    'Entry Time': booking.entryTime,
    'Planned Exit': booking.exitTime,
    Status: booking.bookingStatus,
    'Estimated Parking Charge (INR)': booking.estimatedPrice,
    'Fine (INR)': booking.fineAmount,
    'Total Due (INR)': booking.estimatedPrice + booking.fineAmount,
    'Payment Status': booking.paymentStatus,
    'Payment Method': booking.paymentMethod ?? '',
    'Payment Amount (INR)': booking.paymentAmount ?? '',
    'Paid At': booking.paidAt ?? '',
    'Checked Out At': booking.checkedOutAt ?? '',
  }));
}

function userRows(users: AdminUser[]) {
  return users.map(user => ({
    'User ID': user.id,
    Name: user.username,
    Email: user.email,
    Phone: user.phone,
    Vehicles: user.vehicles
      .map(vehicle => `${vehicle.vehicleType}: ${vehicle.vehicleNumber}`)
      .join('; '),
    'Registered At': user.createdAt ?? '',
  }));
}

function slotRows(slots: ParkingSlot[], asOfDate: string) {
  return slots.map(slot => ({
    'Slot ID': slot.slotNumber,
    Floor: slot.floorNumber,
    'Vehicle Type': slot.slotType,
    Status: slot.status,
    'As Of Date': asOfDate,
  }));
}

function vehicleRows(users: AdminUser[]) {
  return users.flatMap(user =>
    user.vehicles.map(vehicle => ({
      'User ID': user.id,
      Name: user.username,
      Email: user.email,
      'Vehicle Type': vehicle.vehicleType,
      'Vehicle Number': vehicle.vehicleNumber,
      'Registered At': user.createdAt ?? '',
    }))
  );
}

function paymentRows(bookings: AdminBooking[], range: AdminExportRange) {
  return bookingRows(
    bookings.filter(
      booking =>
        (booking.paymentStatus === 'PAID' || booking.bookingStatus === 'COMPLETED') &&
        isInRange(financialDate(booking), range)
    )
  );
}

function fineRows(bookings: AdminBooking[], range: AdminExportRange) {
  return bookings
    .filter(booking => booking.fineAmount > 0 && isInRange(bookingDate(booking), range))
    .map(booking => ({
      'Booking ID': booking.id,
      User: booking.username,
      Email: booking.userEmail,
      'Vehicle Number': booking.vehicleNumber,
      'Vehicle Type': booking.vehicleType,
      'Parking Date': booking.parkingDate,
      'Fine (INR)': booking.fineAmount,
      'Payment Status': booking.paymentStatus,
      'Payment Method': booking.paymentMethod ?? '',
      'Fine Collected (INR)':
        booking.paymentStatus === 'PAID' ? booking.fineAmount : 0,
    }));
}

function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: Record<string, string | number>[]
) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

export function createPaymentsWorkbook(
  bookings: AdminBooking[],
  range: AdminExportRange
): XLSX.WorkBook {
  const records = bookings.filter(
    booking =>
      (booking.paymentStatus === 'PAID' || booking.bookingStatus === 'COMPLETED') &&
      isInRange(financialDate(booking), range)
  );
  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, 'Payments', BOOKING_HEADERS, bookingRows(records));
  return workbook;
}

export function createReportsWorkbook(
  bookings: AdminBooking[],
  users: AdminUser[],
  slots: ParkingSlot[],
  range: AdminExportRange,
  selected: AdminReportSelection
): XLSX.WorkBook {
  const selectedBookings = bookings.filter(booking =>
    isInRange(bookingDate(booking), range)
  );
  const selectedUsers = users.filter(user => isInRange(user.createdAt, range));
  const currentDate = localDate(new Date());
  const selectedSlots = isInRange(currentDate, range) ? slots : [];
  const currentTime = Date.now();
  const currentlyParked = bookings.filter(booking => {
    const entry = new Date(`${booking.parkingDate}T${booking.entryTime}`).getTime();
    return (
      booking.bookingStatus === 'APPROVED' &&
      booking.checkedOutAt === null &&
      isInRange(bookingDate(booking), range) &&
      currentTime >= entry
    );
  });
  const paidInRange = bookings.filter(
    booking => booking.paymentStatus === 'PAID' &&
      isInRange(financialDate(booking), range)
  );
  const workbook = XLSX.utils.book_new();
  if (selected.summary) {
    appendSheet(workbook, 'Summary', [
      'Start Date',
      'End Date',
      'Registered Users',
      'Registered Cars',
      'Registered Bikes',
      'Cars Currently Parked',
      'Bikes Currently Parked',
      'Bookings in Range',
      'Paid Parking and Fines (INR)',
      'Fines Assessed (INR)',
      'Fines Collected (INR)',
      'Parking Status Snapshot Date',
      'Available Slots',
      'Occupied Slots',
      'Reserved Slots',
      'Maintenance Slots',
    ], [{
      'Start Date': range.startDate,
      'End Date': range.endDate,
      'Registered Users': selectedUsers.length,
      'Registered Cars': selectedUsers.reduce(
          (total, user) =>
            total + user.vehicles.filter(vehicle => vehicle.vehicleType === '4 Wheeler').length,
          0
        ),
      'Registered Bikes': selectedUsers.reduce(
          (total, user) =>
            total + user.vehicles.filter(vehicle => vehicle.vehicleType === '2 Wheeler').length,
          0
        ),
      'Cars Currently Parked': currentlyParked.filter(booking => booking.vehicleType === 'CAR').length,
      'Bikes Currently Parked': currentlyParked.filter(booking => booking.vehicleType === 'BIKE').length,
      'Bookings in Range': selectedBookings.length,
      'Paid Parking and Fines (INR)': paidInRange.reduce(
          (total, booking) =>
            total + (booking.paymentAmount ?? booking.estimatedPrice + booking.fineAmount),
          0
        ),
      'Fines Assessed (INR)': selectedBookings.reduce((total, booking) => total + booking.fineAmount, 0),
      'Fines Collected (INR)': paidInRange.reduce((total, booking) => total + booking.fineAmount, 0),
      'Parking Status Snapshot Date': selectedSlots.length ? currentDate : '',
      'Available Slots': selectedSlots.filter(slot => slot.status === 'AVAILABLE').length,
      'Occupied Slots': selectedSlots.filter(slot => slot.status === 'OCCUPIED').length,
      'Reserved Slots': selectedSlots.filter(slot => slot.status === 'RESERVED').length,
      'Maintenance Slots': selectedSlots.filter(slot => slot.status === 'MAINTENANCE').length,
    }]);
  }
  if (selected.bookings) {
    appendSheet(workbook, 'Bookings', BOOKING_HEADERS, bookingRows(selectedBookings));
  }
  if (selected.users) {
    appendSheet(workbook, 'Users', USER_HEADERS, userRows(selectedUsers));
  }
  if (selected.vehicles) {
    appendSheet(workbook, 'Vehicles', VEHICLE_HEADERS, vehicleRows(selectedUsers));
  }
  if (selected.parkingSlots) {
    appendSheet(
      workbook,
      'Parking Slots',
      PARKING_SLOT_HEADERS,
      slotRows(selectedSlots, currentDate)
    );
  }
  if (selected.payments) {
    appendSheet(workbook, 'Payments', BOOKING_HEADERS, paymentRows(bookings, range));
  }
  if (selected.fines) {
    appendSheet(workbook, 'Fines', FINE_HEADERS, fineRows(bookings, range));
  }
  return workbook;
}

export async function downloadAdminWorkbook(
  workbook: XLSX.WorkBook,
  filename: string
): Promise<void> {
  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
    return;
  }

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  const workbookBytes = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as Uint8Array;
  await file.write(workbookBytes);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export SmartPark data',
    UTI: 'com.microsoft.excel.xlsx',
  });
}
