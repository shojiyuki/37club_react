const EARTH_RADIUS_METERS = 6_371_000;

export const DEFAULT_CHECK_IN_LOCATION_POLICY = {
  maxDistanceMeters: 200,
  maxAccuracyMeters: 100,
} as const;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CurrentLocation = Coordinates & {
  accuracy: number;
};

export type CheckInLocationPolicy = {
  maxDistanceMeters: number;
  maxAccuracyMeters: number;
};

export type LocationValidationResult =
  | { ok: true; distanceMeters: number }
  | {
      ok: false;
      reason: "INVALID_LOCATION" | "LOCATION_TOO_INACCURATE" | "OUTSIDE_TOPIC_AREA";
      distanceMeters?: number;
    };

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function isValidCoordinates({ latitude, longitude }: Coordinates): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function calculateDistanceMeters(from: Coordinates, to: Coordinates): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function validateCheckInLocation(
  topicLocation: Coordinates,
  currentLocation: CurrentLocation,
  policy: CheckInLocationPolicy = DEFAULT_CHECK_IN_LOCATION_POLICY,
): LocationValidationResult {
  if (
    !isValidCoordinates(topicLocation) ||
    !isValidCoordinates(currentLocation) ||
    !Number.isFinite(currentLocation.accuracy) ||
    currentLocation.accuracy < 0 ||
    !Number.isFinite(policy.maxDistanceMeters) ||
    policy.maxDistanceMeters < 0 ||
    !Number.isFinite(policy.maxAccuracyMeters) ||
    policy.maxAccuracyMeters < 0
  ) {
    return { ok: false, reason: "INVALID_LOCATION" };
  }

  if (currentLocation.accuracy > policy.maxAccuracyMeters) {
    return { ok: false, reason: "LOCATION_TOO_INACCURATE" };
  }

  const distanceMeters = calculateDistanceMeters(topicLocation, currentLocation);

  if (distanceMeters > policy.maxDistanceMeters) {
    return { ok: false, reason: "OUTSIDE_TOPIC_AREA", distanceMeters };
  }

  return { ok: true, distanceMeters };
}
