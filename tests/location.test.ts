import { describe, expect, it } from "vitest";

import {
  calculateDistanceMeters,
  validateCheckInLocation,
} from "../server/domain/location";

const topicLocation = {
  latitude: 35.6595,
  longitude: 139.7005,
};

describe("calculateDistanceMeters", () => {
  it("returns zero for the same coordinates", () => {
    expect(calculateDistanceMeters(topicLocation, topicLocation)).toBe(0);
  });

  it("calculates the surface distance between two coordinates", () => {
    const distance = calculateDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0.001, longitude: 0 },
    );

    expect(distance).toBeCloseTo(111.19, 1);
  });
});

describe("validateCheckInLocation", () => {
  it("accepts an accurate location within 200 meters", () => {
    const result = validateCheckInLocation(topicLocation, {
      latitude: 35.66,
      longitude: 139.7005,
      accuracy: 20,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.distanceMeters).toBeLessThan(200);
    }
  });

  it("accepts the configured accuracy boundary", () => {
    expect(
      validateCheckInLocation(topicLocation, {
        ...topicLocation,
        accuracy: 100,
      }),
    ).toEqual({ ok: true, distanceMeters: 0 });
  });

  it("rejects an inaccurate current location", () => {
    expect(
      validateCheckInLocation(topicLocation, {
        ...topicLocation,
        accuracy: 100.1,
      }),
    ).toEqual({ ok: false, reason: "LOCATION_TOO_INACCURATE" });
  });

  it("rejects a location outside the allowed distance", () => {
    const result = validateCheckInLocation(topicLocation, {
      latitude: 35.6625,
      longitude: 139.7005,
      accuracy: 20,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "OUTSIDE_TOPIC_AREA",
    });
    if (!result.ok) {
      expect(result.distanceMeters).toBeGreaterThan(200);
    }
  });

  it("accepts the configured distance boundary", () => {
    const currentLocation = {
      latitude: 35.6625,
      longitude: 139.7005,
      accuracy: 20,
    };
    const distanceMeters = calculateDistanceMeters(topicLocation, currentLocation);

    expect(
      validateCheckInLocation(topicLocation, currentLocation, {
        maxDistanceMeters: distanceMeters,
        maxAccuracyMeters: 100,
      }),
    ).toEqual({ ok: true, distanceMeters });
  });

  it.each([
    { latitude: 91, longitude: 139.7005, accuracy: 20 },
    { latitude: 35.6595, longitude: 181, accuracy: 20 },
    { latitude: 35.6595, longitude: 139.7005, accuracy: -1 },
    { latitude: Number.NaN, longitude: 139.7005, accuracy: 20 },
  ])("rejects invalid location values: %o", (currentLocation) => {
    expect(validateCheckInLocation(topicLocation, currentLocation)).toEqual({
      ok: false,
      reason: "INVALID_LOCATION",
    });
  });
});
