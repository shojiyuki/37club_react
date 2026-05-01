import { runtimeConfig, type DataSource } from "@/constants/runtime-config";

export type { DataSource };

export function getDataSource(): DataSource {
  return runtimeConfig.dataSource;
}

export function isMockDataSource(): boolean {
  return getDataSource() === "mock";
}
