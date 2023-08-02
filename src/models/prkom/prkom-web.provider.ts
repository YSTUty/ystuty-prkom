import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse, Method, AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as _ from 'lodash';

import { cacheManager, md5 } from '@my-common';
import * as xEnv from '@my-environment';
import { PrKomBaseProvider } from './prkom-base.provider';
import * as cheerioParser from './cheerio.parser';

const COOKIES_FILE = 'cookies';

@Injectable()
export class PrKomWebProvider extends PrKomBaseProvider {
  public blockedTime: number = 0;
  public queueUpdatingFiles: string[] = [];
  private cookies: Record<string, any> = null;

  constructor(private readonly httpService: HttpService) {
    super();

    httpService.axiosRef.defaults.baseURL = xEnv.YSTU_URL;

    httpService.axiosRef.defaults.headers[
      'User-Agent'
    ] = `${xEnv.APP_NAME}/${process.env.npm_package_version}`;

    httpService.axiosRef.interceptors.response.use(async (response) => {
      const setCookie = response.headers['set-cookie'] as string[];
      if (Array.isArray(setCookie)) {
        const cookies = setCookie.reduce((prev, str) => {
          const [name, data] = str.split('=');
          const [value] = data.split(';');
          return { ...prev, [name]: value };
        }, {});

        Object.assign(this.cookies, cookies);
        await cacheManager.update(COOKIES_FILE, {
          cookies: this.cookies,
        });
        this.logger.debug('Updated cookies', this.cookies);
      }

      return response;
    });
  }

  public async init() {
    if (!this.cookies) {
      const { cookies } = (await cacheManager.readData(COOKIES_FILE)) || {};
      this.cookies = cookies || {};
    }

    return super.init();
  }

  public fetch(
    url: string,
    options?: {
      method?: Method;
      postData?: any;
      axiosConfig?: AxiosRequestConfig<any>;
      useCache: true;
      cacheTtl?: number;
    },
  ): Promise<
    | (AxiosResponse & { isCache: false })
    | { isCache: number; hasError: Error; data: any }
  >;
  public fetch(
    url: string,
    options: {
      method?: Method;
      postData?: any;
      axiosConfig?: AxiosRequestConfig<any>;
      useCache?: false;
      cacheTtl?: number;
    },
  ): Promise<AxiosResponse & { isCache: false }>;
  public async fetch(
    url: string,
    {
      method = 'GET',
      postData = {},
      axiosConfig = {},
      useCache = false,
      cacheTtl,
    }: {
      method?: Method;
      postData?: any;
      axiosConfig?: AxiosRequestConfig<any>;
      useCache?: boolean;
      cacheTtl?: number;
    } = {},
  ) {
    method = method.toUpperCase() as Method;

    if (!axiosConfig.headers) {
      axiosConfig.headers = {
        'Cache-Control': 'no-cache',
      };
    }

    if (method !== 'GET') {
      const params = new URLSearchParams(postData);
      axiosConfig.data = params;
    }

    if (this.cookies) {
      const cookies = Object.entries(this.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
        .trim();
      if (axiosConfig.headers['Cookie']) {
        axiosConfig.headers['Cookie'] += `; ${cookies}`;
      } else {
        axiosConfig.headers['Cookie'] = cookies;
      }
    }

    axiosConfig.params = method === 'GET' ? postData : {};
    axiosConfig.url = url;
    axiosConfig.method = method;

    let file: [string, string];
    if (useCache) {
      file = ['web', `${url}_${method}_${md5(JSON.stringify(axiosConfig))}`];
      const isTimeout = await cacheManager.checkTimeout(file);

      if (isTimeout === false) {
        const {
          data: { data },
          time,
        } = await cacheManager.read<{ data: string }>(file);
        return { isCache: Date.now() - (time || 1), data };
      }
    }

    if (Date.now() - this.blockedTime < 5 * 1e3) {
      // TODO: проверить на правильность поведения
      this.logger.warn('Заблокировано на 5 минут');
      await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1e3));
    }

    try {
      let response = await firstValueFrom(
        this.httpService.request(axiosConfig),
      );
      this.blockedTime = 0;

      if (useCache) {
        this.logger.debug(`[fetch] Update cache: ${url.slice(0, 35)}`);
        await cacheManager.update(file, { data: response.data }, cacheTtl);
      }
      return { ...response, isCache: false };
    } catch (err) {
      if (err instanceof Error) {
        if (
          ['timeout', 'connect ETIMEDOUT'].some((e) => err.message.includes(e))
        ) {
          this.blockedTime = Date.now();
          if (useCache) {
            const {
              data: { data },
              time,
            } = await cacheManager.read<{ data: string }>(file);
            return { isCache: Date.now() - (time || 1), hasError: err, data };
          }
        }
        throw err;
      }
      return { ...err, isCache: false } as AxiosResponse;
    }
  }

  //

  protected async loadListOfIncoming() {
    try {
      const prkom_svod_Response = await this.fetch(
        `${xEnv.PRKOM_SVOD_PATH}/listab1.htm`,
        {
          useCache: true,
          cacheTtl: 1e3 * 60 /* * 60 * 24 */,
        },
      );

      this.incomingsList = cheerioParser.parseMainIncomingsList(
        prkom_svod_Response.data,
      );
      this.loadedFiles = 0;
      return true;
    } catch (err) {
      this.logger.error(err);
    }
    return false;
  }

  public async getIncomingsInfo(
    filename: string,
    cacheTtl = 1e3 * 60 * 7,
    useDefaultSvod = false,
  ) {
    try {
      const { isCache, data } = await this.fetch(
        `${
          useDefaultSvod ? xEnv.PRKOM_SVOD_PATH : xEnv.PRKOM_SVOD_PATH_2
        }/${filename}`,
        {
          useCache: true,
          cacheTtl,
        },
      );

      const response = await cheerioParser.parseIncomingsInfo(data);
      return response ? { isCache, response } : null;
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          if (!useDefaultSvod) {
            return this.getIncomingsInfo(filename, cacheTtl, true);
          }
          return null;
        }
      }
      // this.logger.error('parseIncomingsInfo', err, filename);
      if (err instanceof Error) {
        this.logger.error(err, err.stack, 'parseIncomingsInfo');
      }
      return null;
    }
  }

  public async onFilesWatchLoop() {
    do {
      this.logger.debug('[processFilesWatcher] execute loop');
      if (this.queueUpdatingFiles.length === 0) {
        this.queueUpdatingFiles = [...this.incomingsFileNames];

        this.logger.log(
          `[processFilesWatcher] Updated queue updating files: ${this.queueUpdatingFiles.length}`,
          // this.queueUpdatingFiles,
        );
      }

      do {
        if (!this.filesWatcherPower) {
          break;
        }
        await this.loadListOfIncoming();

        const filename = this.queueUpdatingFiles.shift();
        const incomingsInfo = await this.getIncomingsInfo(filename);
        if (!incomingsInfo) continue;
        this.allIncomingsInfo.set(filename, incomingsInfo);
        this.loadedFiles = this.allIncomingsInfo.size;

        if (!incomingsInfo.isCache) {
          this.logger.log(`[processFilesWatcher] Update file: ${filename}`);
          await new Promise((resolve) => setTimeout(resolve, /* 60 */ 2 * 1e3));
        }

        this.logger.log(
          `[processFilesWatcher] Progress: ${this.queueUpdatingFiles.length} => ${this.allIncomingsInfo.size}`,
        );
      } while (this.queueUpdatingFiles.length > 0);

      if (this.filesWatcherPower) {
        this.logger.log(
          `[processFilesWatcher] All done. Waiting for next update...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 8 * 60 * 1e3));
      }
      await new Promise((resolve) => setImmediate(resolve));
    } while (this.filesWatcherPower);
  }
}
