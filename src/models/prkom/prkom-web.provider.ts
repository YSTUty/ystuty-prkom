import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse, Method, AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as _ from 'lodash';
import * as Fs from 'fs-extra';

import { cacheManager, md5 } from '@my-common';
import * as xEnv from '@my-environment';

import { PrKomBaseProvider } from './prkom-base.provider';
import * as cheerioParser from './cheerio.parser';
import * as pdfParser from './pdf.parser';
import * as pdfReader from './pdf.reader';

const COOKIES_FILE = 'cookies';

@Injectable()
export class PrKomWebProvider extends PrKomBaseProvider {
  public blockedTime: number = 0;
  private cookies: Record<string, any> = null;
  protected timeListOfIncoming = 0;

  public pdfFiles: {
    name: string;
    title: string;
    desc: string;
    link: string;
  }[] = [];
  // public queueUpdatingFiles: string[] = [];

  constructor(private readonly httpService: HttpService) {
    super();

    httpService.axiosRef.defaults.baseURL = xEnv.LINKS_URL;

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

    if (this.pdfFiles.length === 0) {
      const pdfFiles = (await cacheManager.readData<any[]>('pdfFiles')) || [];
      if (pdfFiles?.length > 0) {
        this.pdfFiles = pdfFiles;
      }
    }

    if (this.allIncomingsInfo.size === 0) {
      for (const file of this.pdfFiles) {
        if (!file.name.startsWith('SpiskiPostupayushhih')) {
          // TODO: add parse other files
          continue;
        }
        const incomingsInfo =
          (await cacheManager.readData<any[]>(['incomingsInfo', file.name])) ||
          [];
        this.allIncomingsInfo.set(file.name, incomingsInfo);
      }
      this.logger.debug(
        `Load allIncomingsInfo from cache: ${this.allIncomingsInfo.size}`,
      );
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

  protected async downloadPdf(link: string, filename: string) {
    try {
      const response = await this.fetch(link, {
        // useCache: true,
        axiosConfig: { responseType: 'stream' },
        cacheTtl: 0, // 1e3 * 60 /* * 60 * 24 */,
      });

      // await Fs.writeFile(`${xEnv.CACHE_PATH}/${filename}.pdf`, response.data);
      const writer = Fs.createWriteStream(`${xEnv.CACHE_PATH}/${filename}.pdf`);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      this.logger.debug('downloadPdf done: ' + filename);
      // this.loadedFiles = 0;
      return true;
    } catch (err) {
      this.logger.error('downloadPdf', err);
    }
    return false;
  }

  protected async loadListPdfs() {
    if (Date.now() - this.timeListOfIncoming < 2e3) {
      return;
    }
    this.timeListOfIncoming = Date.now();

    try {
      const response = await this.fetch(`/`, {
        useCache: true,
        cacheTtl: 60e3 * 5 /* * 60 * 24 */,
      });

      // await Fs.writeFile(xEnv.CACHE_PATH + '/test.html', response.data);

      const data = cheerioParser.parseHodPriema(response.data);
      // console.log('parseHodPriema data', data);

      this.pdfFiles = data
        .map((e) => {
          const nameData = e.link.match(
            /\/((?<date>[0-9]{6})_(?<name>(SpiskiPostupayushhih|InformacziyaOHodePriema|InformacziyaOHodePriema|InformacziyaOHodePriema)(?<type>Bak|Mag)(?<type2>Ochnaya|Zaochnaya)?))\.pdf$/i,
          )?.groups as Record<'date' | 'name' | 'type' | 'type2', string>;
          return { ...e, name: nameData?.name, nameData: { ...nameData } };
        })
        .filter((e) => !!e.nameData && e.nameData.type === 'Bak');
      // console.log('this.pdfFiles', this.pdfFiles);

      if (this.pdfFiles.length > 0) {
        try {
          await cacheManager.update('pdfFiles', this.pdfFiles, 360e3);
        } catch (err) {
          this.logger.error('Save pdfFiles', err);
        }
      }

      // this.incomingsList = cheerioParser.parseMainIncomingsList(response.data);

      this.loadedFiles = 0;
      return true;
    } catch (err) {
      this.logger.error(err);
    }
    return false;
  }

  public async getIncomingsInfo(link: string, filename: string) {
    try {
      if (!(await this.downloadPdf(link, filename))) {
        return null;
      }

      const filePathSpiski = `${xEnv.CACHE_PATH}/${filename}.pdf`;
      const buff = await Fs.readFile(filePathSpiski);
      this.logger.debug(`Read buffer done [${filename}] (${buff.length})`);
      const spiskiTables = await pdfReader.loadSpiski(buff);
      this.logger.debug(`Read pdf done [${filename}] (${spiskiTables.length})`);

      const res = spiskiTables.map((table) =>
        pdfParser.parseIncomingsInfo(table),
      );
      await cacheManager.update(['incomingsInfo', filename], res, 12 * 360e3);
      return res;
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
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

  public async getDirectionsInfo(link: string, filename: string) {
    try {
      if (!(await this.downloadPdf(link, filename))) {
        return null;
      }

      const filePathInfo = `${xEnv.CACHE_PATH}/${filename}.pdf`;
      const info = pdfReader.formatInformaziya(
        await pdfReader.loadInformaziya(await Fs.readFile(filePathInfo)),
      );

      await cacheManager.update(['directionsInfo', filename], info, 12 * 360e3);
      return info;
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
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

  public updateCounters(filename: string) {
    const { rows } = this.allDirectionsInfo.get(filename);

    const isBak = filename.includes('PriemaBak');
    const incomingsInfo = this.allIncomingsInfo.get(
      `SpiskiPostupayushhih${isBak ? 'Bak' : 'Mag'}`,
    );

    let updates = 0;
    // if (filename.endsWith('Ochnaya')) {
    for (const row of rows) {
      let found = false;
      for (const incomingInfo of incomingsInfo) {
        if (
          incomingInfo.info.basisAdmission === row.basisAdmission &&
          incomingInfo.info.admissionCategory === row.admissionCategory &&
          // incomingInfo.originalInfo.admissionCategory.replace(
          //   /Категория приема - /,
          //   '',
          // ) === row.admissionCategory &&
          incomingInfo.originalInfo.formTraining.replace(
            /Форма обучения - /,
            '',
          ) === row.formTraining &&
          ((incomingInfo.info.receptionFeatures === 'common' &&
            row.t2 !== 'ОК') ||
            (incomingInfo.info.receptionFeatures === 'separate' &&
              row.t2 === 'ОК')) &&
          row.lsns === incomingInfo.originalInfo.division.split(' / ')[1]
        ) {
          incomingInfo.info.competitionGroupName = row.competitionGroupName;

          incomingInfo.countApplications = Number(row.countApplications);
          incomingInfo.countPlaces = Number(row.countPlaces);

          incomingInfo.info.numbersInfo.total = Number(row.countPlaces);
          incomingInfo.originalInfo.numbersInfo = `Всего мест: ${
            incomingInfo.info.numbersInfo.total
          }. Зачислено: ${
            incomingInfo.info.numbersInfo.enrolled || 0
          }. К зачислению: ${incomingInfo.info.numbersInfo.toenroll || 0}.`;

          ++updates;
          found = true;
          break;
        }
      }
      if (!found) {
        this.logger.warn(
          `[updateCounters] Not found for ${row.competitionGroupName}`,
        );
      }
    }
    // } else if (filename.endsWith('Zaochnaya')) {
    //   //
    // }

    this.logger.debug(`[updateCounters] Count: ${updates} (${filename})`);
  }

  public async onFilesWatchLoop() {
    let queueUpdatingFiles: { link: string; filename: string }[] = [];
    do {
      this.logger.debug('[processFilesWatcher] execute loop');
      if (queueUpdatingFiles.length === 0) {
        queueUpdatingFiles = [
          ...this.pdfFiles.map((e) => ({ link: e.link, filename: e.name })),
        ];

        this.logger.log(
          `[processFilesWatcher] Updated queue updating files: ${queueUpdatingFiles.length}`,
          // queueUpdatingFiles,
        );
      }

      do {
        if (!this.filesWatcherPower) {
          break;
        }
        await this.loadListPdfs();

        const { link, filename } = queueUpdatingFiles.shift();

        if (filename.startsWith('SpiskiPostupayushhih')) {
          const incomingsInfo = await this.getIncomingsInfo(link, filename);
          if (!incomingsInfo) continue;

          this.allIncomingsInfo.set(filename, incomingsInfo);
          // console.log('this.allIncomingsInfo', this.allIncomingsInfo);
        } else if (filename.startsWith('InformacziyaOHodePriema')) {
          const directionsInfo = await this.getDirectionsInfo(link, filename);
          if (!directionsInfo) continue;

          this.allDirectionsInfo.set(filename, directionsInfo);

          this.updateCounters(filename);
          // console.log('this.allDirectionsInfo', this.allDirectionsInfo);
        }

        this.loadedFiles =
          this.allIncomingsInfo.size + this.allDirectionsInfo.size;

        // if (!incomingsInfo.isCache) {
        this.logger.log(`[processFilesWatcher] Update file: ${filename}`);
        await new Promise((resolve) => setTimeout(resolve, /* 60 */ 5 * 1e3));
        // }

        this.logger.log(
          `[processFilesWatcher] Progress: ${queueUpdatingFiles.length} => ${
            this.allIncomingsInfo.size + this.allDirectionsInfo.size
          }`,
        );
      } while (queueUpdatingFiles.length > 0);

      if (this.filesWatcherPower) {
        this.logger.log(
          `[processFilesWatcher] All done. Waiting for next update...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 25 * 60e3));
      }
      await new Promise((resolve) => setImmediate(resolve));
    } while (this.filesWatcherPower);
  }
}
