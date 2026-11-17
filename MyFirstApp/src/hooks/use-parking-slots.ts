import { useCallback, useEffect, useState } from 'react';

import {
  fetchAllParkingSlots,
  fetchParkingSlots,
  type ParkingAvailabilityWindow,
  type ParkingSlot,
  type ParkingSlotStatus,
  type ParkingSlotType,
} from '@/services/parking-slots';

const REFRESH_INTERVAL_MS = 15_000;

export function useParkingSlots(
  floor: number,
  type: ParkingSlotType,
  availability?: ParkingAvailabilityWindow
) {
  const parkingDate = availability?.parkingDate;
  const entryTime = availability?.entryTime;
  const exitTime = availability?.exitTime;
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<{
    query: string;
    refreshVersion: number;
    slots: ParkingSlot[];
    error: string | null;
  }>({
    query: '',
    refreshVersion: -1,
    slots: [],
    error: null,
  });

  const refresh = useCallback(() => {
    setRefreshVersion(version => version + 1);
  }, []);

  const updateSlotStatus = useCallback((
    slotNumber: string,
    status: ParkingSlotStatus
  ) => {
    setResult(previous => ({
      ...previous,
      slots: previous.slots.map(slot =>
        slot.slotNumber === slotNumber ? { ...slot, status } : slot
      ),
    }));
    refresh();
  }, [refresh]);

  const query = `${floor}:${type}:${parkingDate ?? ''}:${entryTime ?? ''}:${exitTime ?? ''}`;

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    const loadSlots = async () => {
      if (requestInFlight) {
        return;
      }

      requestInFlight = true;
      try {
        const latestSlots = await fetchParkingSlots(
          floor,
          type,
          parkingDate && entryTime && exitTime
            ? { parkingDate, entryTime, exitTime }
            : undefined
        );
        if (active) {
          setResult({
            query,
            refreshVersion,
            slots: latestSlots,
            error: null,
          });
        }
      } catch (loadError) {
        if (active) {
          setResult(previous => ({
            query,
            refreshVersion,
            slots: previous.query === query ? previous.slots : [],
            error:
              loadError instanceof Error
                ? loadError.message
                : 'Unable to load parking slots.',
          }));
        }
      } finally {
        requestInFlight = false;
      }
    };

    void loadSlots();
    const intervalId = setInterval(loadSlots, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [entryTime, exitTime, floor, parkingDate, query, refreshVersion, type]);

  const isCurrentQuery = result.query === query;

  return {
    slots: isCurrentQuery ? result.slots : [],
    isLoading:
      !isCurrentQuery || result.refreshVersion !== refreshVersion,
    error:
      isCurrentQuery && result.refreshVersion === refreshVersion
        ? result.error
        : null,
    refresh,
    updateSlotStatus,
  };
}

export function useParkingSlotSummary() {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<{
    refreshVersion: number;
    availableCount: number | null;
    error: string | null;
  }>({
    refreshVersion: -1,
    availableCount: null,
    error: null,
  });

  const refresh = useCallback(() => {
    setRefreshVersion(version => version + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    const loadSummary = async () => {
      if (requestInFlight) {
        return;
      }

      requestInFlight = true;
      try {
        const slots = await fetchAllParkingSlots();
        if (active) {
          setResult({
            refreshVersion,
            availableCount: slots.filter(slot => slot.status === 'AVAILABLE').length,
            error: null,
          });
        }
      } catch (loadError) {
        if (active) {
          setResult(previous => ({
            refreshVersion,
            availableCount: previous.availableCount,
            error:
              loadError instanceof Error
                ? loadError.message
                : 'Unable to load parking slot totals.',
          }));
        }
      } finally {
        requestInFlight = false;
      }
    };

    void loadSummary();
    const intervalId = setInterval(loadSummary, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [refreshVersion]);

  return {
    availableCount: result.availableCount,
    isLoading: result.refreshVersion !== refreshVersion,
    error:
      result.refreshVersion === refreshVersion ? result.error : null,
    refresh,
  };
}
