import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  type AdminReportSelection,
  createPaymentsWorkbook,
  createReportsWorkbook,
  downloadAdminWorkbook,
} from '@/services/admin-excel-export';
import {
  fetchAdminBookings,
  fetchAdminUsers,
} from '@/services/parking-bookings';
import { fetchAllParkingSlots } from '@/services/parking-slots';

type Props = {
  mode: 'payments' | 'reports';
};

const COLORS = {
  navy: '#082D68',
  green: '#16A765',
  text: '#101828',
  muted: '#64748B',
  border: '#E8EDF5',
  white: '#FFFFFF',
  red: '#B42318',
};

const reportOptions: {
  key: keyof AdminReportSelection;
  title: string;
  description: string;
}[] = [
  {
    key: 'summary',
    title: 'Summary & counts',
    description: 'Users, vehicles, parked cars/bikes, slots, payments and fines',
  },
  {
    key: 'bookings',
    title: 'Booking records',
    description: 'Booking, slot, vehicle, schedule, status and charge details',
  },
  {
    key: 'users',
    title: 'User accounts',
    description: 'Registered user details within the selected date range',
  },
  {
    key: 'vehicles',
    title: 'Registered vehicles',
    description: 'One row per registered car or bike within the selected range',
  },
  {
    key: 'parkingSlots',
    title: 'Parking slot status',
    description: 'Current slot status, when today falls within the selected range',
  },
  {
    key: 'payments',
    title: 'Payment records',
    description: 'Paid and completed-unpaid parking payments',
  },
  {
    key: 'fines',
    title: 'Fine records',
    description: 'Fines assessed and whether they were collected',
  },
];

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date | null) {
  return date
    ? date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Select date';
}

function dateKey(date: Date) {
  return toLocalDateString(date);
}

function CalendarPickerModal({
  visible,
  initialDate,
  minimumDate,
  maximumDate,
  onCancel,
  onSelect,
}: {
  visible: boolean;
  initialDate: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onSelect: (date: Date) => void;
}) {
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  const monthLabel = displayMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => setDisplayMonth(new Date(year, month - 1, 1))}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={styles.monthArrow}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.navy} />
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable
              onPress={() => setDisplayMonth(new Date(year, month + 1, 1))}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              style={styles.monthArrow}
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.navy} />
            </Pressable>
          </View>

          <View style={styles.calendarGrid}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.calendarDay} />;
              }
              const date = new Date(year, month, day);
              const key = dateKey(date);
              const selected = key === dateKey(initialDate);
              const disabled =
                (minimumDate !== undefined && key < dateKey(minimumDate)) ||
                (maximumDate !== undefined && key > dateKey(maximumDate));
              return (
                <Pressable
                  key={key}
                  disabled={disabled}
                  onPress={() => onSelect(date)}
                  style={[
                    styles.calendarDay,
                    selected && styles.selectedCalendarDay,
                    disabled && styles.disabledCalendarDay,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthLabel} ${day}`}
                  accessibilityState={{ selected, disabled }}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      selected && styles.selectedCalendarDayText,
                      disabled && styles.disabledCalendarDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarActions}>
            <Pressable onPress={onCancel} style={styles.cancelDateButton}>
              <Text style={styles.cancelDateText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminExportPanel({ mode }: Props) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportSelection, setReportSelection] = useState<AdminReportSelection>({
    summary: false,
    bookings: false,
    users: false,
    vehicles: false,
    parkingSlots: false,
    payments: false,
    fines: false,
  });

  const exportWorkbook = async () => {
    if (!startDate || !endDate) {
      setError('Select both a start date and an end date.');
      return;
    }

    const range = {
      startDate: toLocalDateString(startDate),
      endDate: toLocalDateString(endDate),
    };
    if (range.startDate > range.endDate) {
      setError('The start date must be on or before the end date.');
      return;
    }
    if (
      mode === 'reports' &&
      !Object.values(reportSelection).some(selected => selected)
    ) {
      setError('Tick at least one type of report data to include.');
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      let workbook;
      if (mode === 'payments') {
        workbook = createPaymentsWorkbook(await fetchAdminBookings(), range);
      } else {
        const needsBookings =
          reportSelection.summary ||
          reportSelection.bookings ||
          reportSelection.payments ||
          reportSelection.fines;
        const needsUsers =
          reportSelection.summary || reportSelection.users || reportSelection.vehicles;
        const needsSlots = reportSelection.summary || reportSelection.parkingSlots;
        const [bookings, users, slots] = await Promise.all([
          needsBookings ? fetchAdminBookings() : Promise.resolve([]),
          needsUsers ? fetchAdminUsers() : Promise.resolve([]),
          needsSlots ? fetchAllParkingSlots() : Promise.resolve([]),
        ]);
        workbook = createReportsWorkbook(
          bookings,
          users,
          slots,
          range,
          reportSelection
        );
      }
      const filename = `smartpark-${mode}-${range.startDate}-to-${range.endDate}.xlsx`;
      await downloadAdminWorkbook(workbook, filename);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Could not create the Excel workbook.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <Ionicons name="download-outline" size={22} color={COLORS.navy} />
        <Text style={styles.heading}>
          {mode === 'payments' ? 'Export payment details' : 'Export reports'}
        </Text>
      </View>
      <Text style={styles.description}>
        Choose a custom date range to download an Excel workbook (.xlsx).
        {mode === 'reports'
          ? ' Each selected section is a worksheet with field names in the first row and one record per row. The range filters bookings and fines by parking date, payments by payment/checkout/parking date, and users/vehicles by registration date. Slot status is a current snapshot, included only when today is in range.'
          : ' The workbook contains one payment record per row, filtered to the selected date range.'}
      </Text>

      {mode === 'reports' && (
        <View style={styles.reportOptions}>
          <Text style={styles.label}>Choose report data</Text>
          {reportOptions.map(option => {
            const checked = reportSelection[option.key];
            return (
              <Pressable
                key={option.key}
                style={styles.reportOption}
                onPress={() => {
                  setError(null);
                  setReportSelection(previous => ({
                    ...previous,
                    [option.key]: !previous[option.key],
                  }));
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={21}
                  color={checked ? COLORS.navy : COLORS.muted}
                />
                <View style={styles.reportOptionCopy}>
                  <Text style={styles.reportOptionTitle}>{option.title}</Text>
                  <Text style={styles.reportOptionDescription}>
                    {option.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.dateRow}>
        <View style={styles.dateColumn}>
          <Text style={styles.label}>Start date</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setPicker('start')}
            accessibilityRole="button"
          >
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={COLORS.navy} />
          </Pressable>
        </View>
        <View style={styles.dateColumn}>
          <Text style={styles.label}>End date</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setPicker('end')}
            accessibilityRole="button"
          >
            <Text style={styles.dateText}>{formatDate(endDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={COLORS.navy} />
          </Pressable>
        </View>
      </View>

      {picker && (
        <CalendarPickerModal
          key={picker}
          visible
          initialDate={
            picker === 'start'
              ? startDate ?? new Date()
              : endDate ?? startDate ?? new Date()
          }
          maximumDate={picker === 'start' ? endDate ?? undefined : undefined}
          minimumDate={picker === 'end' ? startDate ?? undefined : undefined}
          onCancel={() => setPicker(null)}
          onSelect={date => {
            if (picker === 'start') setStartDate(date);
            else setEndDate(date);
            setPicker(null);
          }}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.exportButton, isExporting && styles.disabledButton]}
        disabled={isExporting}
        onPress={() => void exportWorkbook()}
        accessibilityRole="button"
      >
        {isExporting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="download-outline" size={19} color={COLORS.white} />
            <Text style={styles.exportButtonText}>Download Excel</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  description: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  reportOptions: {
    marginTop: 16,
    gap: 4,
  },
  reportOption: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  reportOptionCopy: {
    flex: 1,
  },
  reportOptionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  reportOptionDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  dateColumn: {
    flex: 1,
  },
  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  dateButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  dateText: {
    color: COLORS.text,
    fontSize: 12,
  },
  error: {
    color: COLORS.red,
    fontSize: 13,
    marginTop: 10,
  },
  exportButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    padding: 18,
    borderRadius: 18,
    backgroundColor: COLORS.white,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F4F9',
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: '14.2857%',
    height: 34,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarDay: {
    width: '14.2857%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  selectedCalendarDay: {
    backgroundColor: COLORS.navy,
  },
  disabledCalendarDay: {
    opacity: 0.35,
  },
  calendarDayText: {
    color: COLORS.text,
    fontSize: 14,
  },
  selectedCalendarDayText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  disabledCalendarDayText: {
    color: COLORS.muted,
  },
  calendarActions: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  cancelDateButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelDateText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '700',
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
