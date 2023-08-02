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
export const SERVER_PORT: number = +process.env.SERVER_PORT || 8080;
export const SERVER_API_ACCESS_TOKEN: string =
  process.env.SERVER_API_ACCESS_TOKEN ||
  Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

export const YSTU_URL: string =
  process.env.YSTU_URL || 'https://www.ystu.ru/files/prkom_svod';

// * Swagger
export const SWAGGER_ACCESS_USERNAME: string =
  process.env.SWAGGER_ACCESS_USERNAME || '';
export const SWAGGER_ACCESS_PASSWORD: string =
  process.env.SWAGGER_ACCESS_PASSWORD || '';

export const USE_SYS_FW_WATCHER: boolean =
  process.env.USE_SYS_FW_WATCHER !== 'false';
