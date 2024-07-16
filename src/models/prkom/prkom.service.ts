import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as _ from 'lodash';
import { convertToNumeric } from '@my-common';

import { PrKomWebProvider } from './prkom-web.provider';

@Injectable()
export class PrKomService implements OnModuleInit {
  private readonly logger = new Logger(PrKomService.name);

  constructor(private readonly prKomWebProvider: PrKomWebProvider) {}

  public isLoaded = false;

  async onModuleInit() {
    this.logger.log('Start initializing provider...');

    await this.prKomWebProvider.init();

    this.prKomProvider.processFilesWatcher().then();
    this.logger.log('Initializing provider finished');

    this.isLoaded = true;
  }

  public get prKomProvider() {
    return this.prKomWebProvider;
  }

  // public async getFiles() {
  //   if (this.prKomProvider.loadedFiles < 0) {
  //     throw new BadRequestException('wait for app initialization');
  //   }

  //   return this.prKomProvider.incomingsFilesWithInfo;
  // }

  public async getIncomingsList() {
    if (
      this.prKomProvider.pdfFiles.length === 0
      // this.prKomProvider.incomingsList.length === 0
    ) {
      throw new BadRequestException('wait for app initialization');
    }

    return [...this.prKomProvider.allIncomingsInfo.entries()].map(
      ([filename, info]) => {
        const file = this.prKomProvider.pdfFiles.find(
          (e) => e.name === filename,
        );
        return {
          title: file.title,
          name: file.name,
          desc: file.desc,
          docLink: file.link,
          specialties: info.map((e) => ({
            info: e.info,
            originalInfo: e.originalInfo,
            hash: e.hash,
          })),
        };
      },
    );
  }

  public async getInfo() {
    return {
      isLoaded: this.isLoaded,
      loadedFiles: this.prKomProvider.loadedFiles,

      blockedTime: this.prKomWebProvider.blockedTime,
      filesWatcherPower: this.prKomWebProvider.filesWatcherPower,
      // queueUpdatingFiles: this.prKomWebProvider.queueUpdatingFiles,
      // queueUpdatingFilesLen: this.prKomWebProvider.queueUpdatingFiles.length,
    };
  }

  // public async getAllIncomingsInfoList(showOriginalInfo = false) {
  //   if (!this.isLoaded) {
  //     throw new BadRequestException('wait for app initialization');
  //   }

  //   return [...this.prKomProvider.allIncomingsInfo.entries()].map(
  //     ([filename, response]) => ({
  //       filename,
  //       response: response.map((e) => ({
  //         info: e.info,
  //         list: e.list,
  //         titles: e.titles,
  //         ...(showOriginalInfo && { originalInfo: e.originalInfo }),
  //       })),
  //       // isCache,
  //       // response: {
  //       //   info: response.info,
  //       //   list: response.list,
  //       //   titles: response.titles,
  //       //   // ...(showOriginalInfo && { originalInfo: response.originalInfo }),
  //       // },
  //     }),
  //   );
  // }

  public async getIncomingsInfoListByFile(
    filename: string,
    specHash?: string,
    showOriginalInfo = false,
  ) {
    if (!this.isLoaded) {
      throw new BadRequestException('wait for app initialization');
    }

    if (!this.prKomProvider.allIncomingsInfo.has(filename)) {
      return false;
    }

    const incomingsInfo = this.prKomProvider.allIncomingsInfo.get(filename);

    if (specHash) {
      const incomingInfo = incomingsInfo.find((e) => e.hash === specHash);
      if (!incomingInfo) {
        return false;
      }

      const file = this.prKomProvider.pdfFiles.find((e) => e.name === filename);

      return {
        filename,
        response: {
          info: incomingInfo.info,
          titles: incomingInfo.titles,
          ...(showOriginalInfo && { originalInfo: incomingInfo.originalInfo }),
          list: incomingInfo.list,
          docLink: file.link,
        },
      };
    }

    return {
      filename,
      response: incomingsInfo.map((e) => ({
        info: e.info,
        titles: e.titles,
        ...(showOriginalInfo && { originalInfo: e.originalInfo }),
        // list: e.list,
      })),
      // isCache,
      // response: {
      //   info: response.info,
      //   list: response.list,
      //   titles: response.titles,
      //   ...(showOriginalInfo && { originalInfo: response.originalInfo }),
      // },
    };
  }

  public async getByUids(uids: string[], showOriginalInfo = false) {
    if (!this.isLoaded) {
      throw new BadRequestException('wait for app initialization');
    }
    uids = uids.map(convertToNumeric).filter(Boolean);
    if (uids.length === 0) {
      return [];
    }

    const result = [...this.prKomProvider.allIncomingsInfo.entries()]
      .flatMap(([filename, items]) => {
        const listV: {
          filename: string;
          info: any;
          originalInfo: any;
          item: any;
          hash: string;
          payload: {
            beforeOriginals: number;
            beforeGreens: number;
            afterGreens: number;
            totalItems: number;
          };
        }[] = [];

        for (const itemZ of items) {
          const item = itemZ.list.find((e) =>
            uids.includes(convertToNumeric(e?.uid)),
          );
          if (!item) {
            continue;
            // return null;
          }

          let beforeOriginals = 0;
          let beforeGreens = 0;
          let afterGreens = 0;
          for (const el of itemZ.list) {
            if (
              el.originalInUniversity ||
              el.originalFromEGPU ||
              el.docType === 'original'
            ) {
              if (el.position < item.position) {
                ++beforeOriginals;
              }
            }

            // TODO: its not implemented yet (`isGreen`)

            // if (el.isGreen) {
            //   if (el.position < item.position) {
            //     beforeGreens++;
            //   } else if (el.position !== item.position) {
            //     afterGreens++;
            //   }
            // }
          }

          listV.push({
            // isCache,
            filename,
            info: itemZ.info,
            hash: itemZ.hash,
            ...(showOriginalInfo && { originalInfo: itemZ.originalInfo }),
            item,
            payload: {
              beforeOriginals,
              beforeGreens,
              afterGreens,
              totalItems: itemZ.list.length,
            },
          });
        }
        if (listV.length === 0) {
          return null;
        }
        return listV;
      })
      .filter(Boolean);

    return result;
  }

  public async onAction(action: string) {
    switch (action) {
      case 'stop':
        this.prKomProvider.filesWatcherPower = false;
        return 'stoping...';

      case 'start':
        this.prKomProvider.processFilesWatcher().then();
        return 'started';

      default:
        return 'unknown action';
    }
  }
}
