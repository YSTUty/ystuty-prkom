import 'dotenv/config';

export enum EnvType {
  DEV = 'development',
  PROD = 'production',
  TEST = 'testing',
}

// environment
export const NODE_ENV: EnvType =
  (process.env.NODE_ENV as EnvType) || EnvType.DEV;

export const CACHE_PATH: string = process.env.CACHE_PATH || './.cache-store';

// Application
export const APP_NAME: string = process.env.MAIN_NAME || 'YSTUty PrKom';
export const APP_DOMAIN: string = process.env.MAIN_DOMAIN || '127.0.0.1';
export const SERVER_PORT: number = +process.env.SERVER_PORT || 8080;
export const SERVER_URL: string =
  process.env.SERVER_URL || `http://${APP_DOMAIN}:${SERVER_PORT}`;
