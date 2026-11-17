import { Platform } from 'react-native';

export type ParkingSlotType = 'BIKE' | 'CAR';
export type ParkingSlotStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'RESERVED';

export type ParkingAvailabilityWindow = {
  parkingDate: string;
  entryTime: string;
  exitTime: string;
};

export type ParkingSlot = {
  id: string;
  slotNumber: string;
  floorNumber: number;
  slotType: ParkingSlotType;
  status: ParkingSlotStatus;
};

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const defaultApiUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export const API_BASE_URL = (configuredApiUrl || defaultApiUrl).replace(/\/+$/, '');

async function requestParkingSlots(path: string): Promise<ParkingSlot[]> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      `Could not connect to the parking server at ${API_BASE_URL}. Check the backend and API URL.`
    );
  }

  if (!response.ok) {
    throw new Error(`Parking server returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Parking server returned an invalid slots response.');
  }

  return payload.map(parseParkingSlot);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseParkingSlot(value: unknown, index: number): ParkingSlot {
  if (
    !isRecord(value) ||
    typeof value.slotNumber !== 'string' ||
    typeof value.floorNumber !== 'number' ||
    (value.slotType !== 'BIKE' && value.slotType !== 'CAR') ||
    (value.status !== 'AVAILABLE' &&
      value.status !== 'OCCUPIED' &&
      value.status !== 'MAINTENANCE' &&
      value.status !== 'RESERVED')
  ) {
    throw new Error(`Parking server returned an invalid slot at position ${index + 1}.`);
  }

  return {
    id: typeof value.id === 'string' ? value.id : value.slotNumber,
    slotNumber: value.slotNumber,
    floorNumber: value.floorNumber,
    slotType: value.slotType,
    status: value.status,
  };
}

export async function fetchParkingSlots(
  floor: number,
  type: ParkingSlotType,
  availability?: ParkingAvailabilityWindow
): Promise<ParkingSlot[]> {
  const path = availability
    ? `/api/parking/slots/availability?floor=${floor}&type=${type}` +
      `&parkingDate=${encodeURIComponent(availability.parkingDate)}` +
      `&entryTime=${encodeURIComponent(availability.entryTime)}` +
      `&exitTime=${encodeURIComponent(availability.exitTime)}`
    : `/api/parking/slots/floor/${floor}`;
  return (await requestParkingSlots(path))
    .filter(slot => slot.floorNumber === floor && slot.slotType === type)
    .sort((left, right) => left.slotNumber.localeCompare(right.slotNumber));
}

export async function fetchAllParkingSlots(): Promise<ParkingSlot[]> {
  return (await requestParkingSlots('/api/parking/slots')).sort(
    (left, right) =>
      left.floorNumber - right.floorNumber ||
      left.slotNumber.localeCompare(right.slotNumber)
  );
}

export async function updateParkingSlotStatus(
  slotNumber: string,
  status: 'AVAILABLE' | 'MAINTENANCE'
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/parking/slots/${encodeURIComponent(slotNumber)}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    );
  } catch {
    throw new Error(
      `Could not connect to the parking server at ${API_BASE_URL}.`
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' &&
      body !== null &&
      'detail' in body &&
      typeof body.detail === 'string'
        ? body.detail
        : `Parking server returned HTTP ${response.status}.`;
    throw new Error(message);
  }
}
