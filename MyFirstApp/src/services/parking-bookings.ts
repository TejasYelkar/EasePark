import { API_BASE_URL } from './parking-slots';
import type { Account, AccountVehicle } from '@/screens/UserScreens';

export type RegisteredUser = {
  id: string;
  username: string;
  email: string;
  phone: string;
};

export type AuthenticatedUser = RegisteredUser & {
  vehicles: AccountVehicle[];
};

export type PendingBookingNotification = {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  slotId: string;
  vehicleNumber: string;
  floorNumber: number;
  vehicleType: string;
  parkingDate: string;
  entryTime: string;
  exitTime: string;
  bookingStatus: 'PENDING';
  estimatedPrice: number;
};

export type UserParkingBooking = {
  id: string;
  userId: string;
  slotId: string;
  vehicleNumber: string;
  floorNumber: number;
  vehicleType: string;
  parkingDate: string;
  entryTime: string;
  exitTime: string;
  bookingStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  estimatedPrice: number;
  fineAmount: number;
  paymentAmount: number | null;
  paymentMethod: string | null;
  paymentStatus: 'UNPAID' | 'PAID';
  paidAt: string | null;
  checkedOutAt: string | null;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  phone: string;
  vehicles: AccountVehicle[];
  createdAt: string | null;
};

export type AdminBooking = UserParkingBooking & {
  username: string;
  userEmail: string;
  createdAt: string | null;
};

export type UnregisteredVehicle = {
  id: string;
  plateNumber: string;
  ownerName: string;
  mobileNumber: string;
  vehicleType: '2 Wheeler' | '4 Wheeler';
  temporary: boolean;
  createdAt: string | null;
};

type AccountPayload = Pick<Account, 'username' | 'email' | 'phone'> & {
  vehicles: AccountVehicle[];
};

type BookingRequest = {
  userId: string;
  slotId: string;
  vehicleType: string;
  vehicleNumber: string;
  parkingDate: string;
  entryTime: string;
  exitTime: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

class ApiRequestError extends Error {
  fieldErrors?: Record<string, string>;
}

function isAccountVehicleType(value: unknown): value is AccountVehicle['vehicleType'] {
  return value === '2 Wheeler' || value === '4 Wheeler';
}

function isUserBookingStatus(
  value: unknown
): value is UserParkingBooking['bookingStatus'] {
  return value === 'PENDING' ||
    value === 'APPROVED' ||
    value === 'REJECTED' ||
    value === 'COMPLETED';
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(`Could not connect to the parking server at ${API_BASE_URL}.`);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const requestError = new ApiRequestError();
    const serverMessage =
      isRecord(body) &&
      (typeof body.detail === 'string' || typeof body.message === 'string')
        ? String(body.detail ?? body.message)
        : null;
    if (isRecord(body) && isRecord(body.fieldErrors)) {
      requestError.fieldErrors = Object.fromEntries(
        Object.entries(body.fieldErrors).filter(
          ([, value]) => typeof value === 'string'
        ) as [string, string][]
      );
    }
    const message =
      serverMessage ??
      (response.status === 409 && path === '/api/users/register'
        ? 'This username or email is already registered. Sign in with that account or use different details.'
        : `Parking server returned HTTP ${response.status}.`);
    requestError.message = message;
    throw requestError;
  }
  return body;
}

function accountPayload(account: Account): AccountPayload {
  return {
    username: account.username,
    email: account.email,
    phone: account.phone,
    vehicles: account.vehicles ?? [{
      vehicleType: account.vehicleType,
      vehicleNumber: account.vehicleNumber,
    }],
  };
}

function parseRegisteredUser(value: unknown): RegisteredUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.phone !== 'string'
  ) {
    throw new Error('Parking server returned an invalid registered-user response.');
  }
  return {
    id: value.id,
    username: value.username,
    email: value.email,
    phone: value.phone,
  };
}

export async function registerUser(
  account: Account,
  password: string
): Promise<RegisteredUser> {
  const response = await requestJson('/api/users/register', {
    method: 'POST',
    body: JSON.stringify({ ...accountPayload(account), password }),
  });
  return parseRegisteredUser(response);
}

export async function loginRegisteredUser(
  credentials: {
    username: string;
    password: string;
    vehicleType: string;
    vehicleNumber: string;
  }
): Promise<AuthenticatedUser> {
  const response = await requestJson('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  if (
    !isRecord(response) ||
    typeof response.id !== 'string' ||
    typeof response.username !== 'string' ||
    typeof response.email !== 'string' ||
    typeof response.phone !== 'string' ||
    !Array.isArray(response.vehicles)
  ) {
    throw new Error('Parking server returned an invalid login response.');
  }
  const vehicles = response.vehicles.map(vehicle => {
    if (
      !isRecord(vehicle) ||
      !isAccountVehicleType(vehicle.vehicleType) ||
      typeof vehicle.vehicleNumber !== 'string'
    ) {
      throw new Error('Parking server returned an invalid registered vehicle.');
    }
    return {
      vehicleType: vehicle.vehicleType,
      vehicleNumber: vehicle.vehicleNumber,
    };
  });
  return {
    id: response.id,
    username: response.username,
    email: response.email,
    phone: response.phone,
    vehicles,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  await requestJson('/api/users/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  await requestJson('/api/users/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export async function verifyRegisteredUser(
  account: Account,
  vehicleType: string,
  vehicleNumber: string,
  username = account.username
): Promise<RegisteredUser> {
  const response = await requestJson('/api/users/verify', {
    method: 'POST',
    body: JSON.stringify({
      userId: account.backendUserId,
      username,
      vehicleType,
      vehicleNumber,
    }),
  });
  return parseRegisteredUser(response);
}

export async function updateRegisteredUser(
  userId: string,
  account: Account
): Promise<RegisteredUser> {
  const response = await requestJson(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(accountPayload(account)),
  });
  return parseRegisteredUser(response);
}

export async function createUnregisteredVehicle(request: {
  plateNumber: string;
  ownerName: string;
  mobileNumber: string;
  vehicleType: '2 Wheeler' | '4 Wheeler';
}): Promise<UnregisteredVehicle> {
  const response = await requestJson('/api/admin/unregistered-vehicles', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (
    !isRecord(response) ||
    typeof response.id !== 'string' ||
    typeof response.plateNumber !== 'string' ||
    typeof response.ownerName !== 'string' ||
    typeof response.mobileNumber !== 'string' ||
    !isAccountVehicleType(response.vehicleType) ||
    response.temporary !== true
  ) {
    throw new Error('Parking server returned an invalid unregistered vehicle response.');
  }
  return {
    id: response.id,
    plateNumber: response.plateNumber,
    ownerName: response.ownerName,
    mobileNumber: response.mobileNumber,
    vehicleType: response.vehicleType,
    temporary: true,
    createdAt: typeof response.createdAt === 'string' ? response.createdAt : null,
  };
}

export async function requestParkingBooking(
  request: BookingRequest
): Promise<PendingBookingNotification> {
  const response = await requestJson('/api/parking/bookings', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (
    !isRecord(response) ||
    typeof response.id !== 'string' ||
    typeof response.userId !== 'string' ||
    typeof response.username !== 'string' ||
    typeof response.userEmail !== 'string' ||
    typeof response.slotId !== 'string' ||
    typeof response.vehicleNumber !== 'string' ||
    typeof response.floorNumber !== 'number' ||
    typeof response.vehicleType !== 'string' ||
    typeof response.parkingDate !== 'string' ||
    typeof response.entryTime !== 'string' ||
    typeof response.exitTime !== 'string' ||
    typeof response.estimatedPrice !== 'number' ||
    response.bookingStatus !== 'PENDING'
  ) {
    throw new Error('Parking server returned an invalid booking response.');
  }
  return {
    id: response.id,
    userId: response.userId,
    username: response.username,
    userEmail: response.userEmail,
    slotId: response.slotId,
    vehicleNumber: response.vehicleNumber,
    floorNumber: response.floorNumber,
    vehicleType: response.vehicleType,
    parkingDate: response.parkingDate,
    entryTime: response.entryTime,
    exitTime: response.exitTime,
    bookingStatus: 'PENDING',
    estimatedPrice: response.estimatedPrice,
  };
}

export async function fetchPendingBookingNotifications(): Promise<
  PendingBookingNotification[]
> {
  const response = await requestJson('/api/admin/notifications');
  if (!Array.isArray(response)) {
    throw new Error('Parking server returned an invalid notifications response.');
  }
  return response.map(value => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.userId !== 'string' ||
      typeof value.username !== 'string' ||
      typeof value.userEmail !== 'string' ||
      typeof value.slotId !== 'string' ||
      typeof value.vehicleNumber !== 'string' ||
      typeof value.floorNumber !== 'number' ||
      typeof value.parkingDate !== 'string' ||
      typeof value.entryTime !== 'string' ||
      typeof value.exitTime !== 'string' ||
      typeof value.vehicleType !== 'string' ||
      typeof value.estimatedPrice !== 'number' ||
      value.bookingStatus !== 'PENDING'
    ) {
      throw new Error('Parking server returned an invalid booking notification.');
    }
    return {
      id: value.id,
      userId: value.userId,
      username: value.username,
      userEmail: value.userEmail,
      slotId: value.slotId,
      vehicleNumber: value.vehicleNumber,
      floorNumber: value.floorNumber,
      vehicleType: value.vehicleType,
      parkingDate: value.parkingDate,
      entryTime: value.entryTime,
      exitTime: value.exitTime,
      bookingStatus: 'PENDING',
      estimatedPrice: value.estimatedPrice,
    };
  });
}

export async function reviewBookingNotification(
  bookingId: string,
  decision: 'APPROVE' | 'REJECT'
): Promise<void> {
  await requestJson(
    `/api/admin/notifications/${encodeURIComponent(bookingId)}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }
  );
}

function parseUserBooking(value: unknown, index: number): UserParkingBooking {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.userId !== 'string' ||
    typeof value.slotId !== 'string' ||
    typeof value.vehicleNumber !== 'string' ||
    typeof value.floorNumber !== 'number' ||
    typeof value.vehicleType !== 'string' ||
    typeof value.parkingDate !== 'string' ||
    typeof value.entryTime !== 'string' ||
    typeof value.exitTime !== 'string' ||
    !isUserBookingStatus(value.bookingStatus) ||
    typeof value.estimatedPrice !== 'number' ||
    typeof value.fineAmount !== 'number' ||
    (value.paymentAmount !== undefined &&
      value.paymentAmount !== null &&
      typeof value.paymentAmount !== 'number') ||
    (value.paymentMethod !== undefined &&
      value.paymentMethod !== null &&
      typeof value.paymentMethod !== 'string') ||
    (value.paymentStatus !== 'UNPAID' && value.paymentStatus !== 'PAID') ||
    (value.paidAt !== undefined && value.paidAt !== null && typeof value.paidAt !== 'string') ||
    (value.checkedOutAt !== null && typeof value.checkedOutAt !== 'string')
  ) {
    throw new Error(
      `Parking server returned an invalid booking at position ${index + 1}.`
    );
  }

  return {
    id: value.id,
    userId: value.userId,
    slotId: value.slotId,
    vehicleNumber: value.vehicleNumber,
    floorNumber: value.floorNumber,
    vehicleType: value.vehicleType,
    parkingDate: value.parkingDate,
    entryTime: value.entryTime,
    exitTime: value.exitTime,
    bookingStatus: value.bookingStatus,
    estimatedPrice: value.estimatedPrice,
    fineAmount: value.fineAmount,
    paymentAmount: typeof value.paymentAmount === 'number' ? value.paymentAmount : null,
    paymentMethod: typeof value.paymentMethod === 'string' ? value.paymentMethod : null,
    paymentStatus: value.paymentStatus,
    paidAt: typeof value.paidAt === 'string' ? value.paidAt : null,
    checkedOutAt: value.checkedOutAt,
  };
}

export async function fetchUserBookings(userId: string): Promise<UserParkingBooking[]> {
  const response = await requestJson(
    `/api/parking/bookings/user/${encodeURIComponent(userId)}`
  );
  if (!Array.isArray(response)) {
    throw new Error('Parking server returned an invalid bookings response.');
  }
  return response.map(parseUserBooking);
}

export async function fetchAdminBookings(): Promise<AdminBooking[]> {
  const response = await requestJson('/api/admin/bookings');
  if (!Array.isArray(response)) {
    throw new Error('Parking server returned an invalid admin bookings response.');
  }
  return response.map((value, index) => {
    if (
      !isRecord(value) ||
      typeof value.username !== 'string' ||
      typeof value.userEmail !== 'string'
    ) {
      throw new Error(`Parking server returned an invalid admin booking at position ${index + 1}.`);
    }

    const booking = parseUserBooking(value, index);
    return {
      ...booking,
      username: value.username,
      userEmail: value.userEmail,
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    };
  });
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await requestJson('/api/admin/users');
  if (!Array.isArray(response)) {
    throw new Error('Parking server returned an invalid admin users response.');
  }
  return response.map((value, index) => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.username !== 'string' ||
      typeof value.email !== 'string' ||
      typeof value.phone !== 'string' ||
      !Array.isArray(value.vehicles)
    ) {
      throw new Error(`Parking server returned an invalid user at position ${index + 1}.`);
    }
    const vehicles = value.vehicles.map(vehicle => {
      if (
        !isRecord(vehicle) ||
        !isAccountVehicleType(vehicle.vehicleType) ||
        typeof vehicle.vehicleNumber !== 'string'
      ) {
        throw new Error('Parking server returned an invalid registered vehicle.');
      }
      return {
        vehicleType: vehicle.vehicleType,
        vehicleNumber: vehicle.vehicleNumber,
      };
    });
    return {
      id: value.id,
      username: value.username,
      email: value.email,
      phone: value.phone,
      vehicles,
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    };
  });
}

async function submitUserBookingAction(
  bookingId: string,
  userId: string,
  action: 'checkout' | 'payment'
): Promise<void> {
  await requestJson(
    `/api/parking/bookings/${encodeURIComponent(bookingId)}/${action}`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }
  );
}

export async function checkoutUserBooking(
  bookingId: string,
  userId: string
): Promise<void> {
  await submitUserBookingAction(bookingId, userId, 'checkout');
}

export async function payUserBooking(
  bookingId: string,
  userId: string
): Promise<void> {
  await submitUserBookingAction(bookingId, userId, 'payment');
}
