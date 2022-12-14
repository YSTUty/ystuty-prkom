import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import { PrKomProvider } from './prkom.provider';

@Injectable()
export class PrKomService implements OnModuleInit {
  private readonly logger = new Logger(PrKomService.name);

  constructor(private readonly prKomProvider: PrKomProvider) {}

  public isLoaded = false;

  async onModuleInit() {
    this.logger.log('Start initializing provider...');
    await this.prKomProvider.init();
    this.logger.log('Initializing provider finished');

    this.init().then();
  }

  public async init() {
    // ...
    this.isLoaded = true;

    this.prKomProvider.processFilesWatcher().then();
  }

  public async getFiles() {
    if (this.prKomProvider.loadedFiles < 0) {
      throw new BadRequestException('wait for app initialization');
    }

    return this.prKomProvider.incomingsFilesWithInfo;
  }

  public async getInfo() {
    return {
      isLoaded: this.isLoaded,
      blockedTime: this.prKomProvider.blockedTime,
      filesWatcherPower: this.prKomProvider.filesWatcherPower,
      loadedFiles: this.prKomProvider.loadedFiles,
      queueUpdatingFiles: this.prKomProvider.queueUpdatingFiles,
      queueUpdatingFilesLen: this.prKomProvider.queueUpdatingFiles.length,
    };
  }

  public async getList(showOriginalInfo = false) {
    if (!this.isLoaded) {
      throw new BadRequestException('wait for app initialization');
    }

    return [...this.prKomProvider.allMagaIncomingsInfo.entries()].map(
      ([filename, { isCache, response }]) => ({
        filename,
        isCache,
        response: {
          info: response.info,
          list: response.list,
          ...(showOriginalInfo && { originalInfo: response.originalInfo }),
        },
      }),
    );
  }

  public async getByUid(uid: string, showOriginalInfo = false) {
    if (!this.isLoaded) {
      throw new BadRequestException('wait for app initialization');
    }

    const result = [...this.prKomProvider.allMagaIncomingsInfo.entries()]
      .map(([filename, { response: e, isCache }]) => {
        const item = e.list.find((e) => e?.uid === uid);
        if (!item) {
          return null;
        }
        let afterGreens = 0;
        let beforeGreens = 0;
        for (const el of e.list) {
          if (el.isGreen) {
            if (el.position < item.position) {
              beforeGreens++;
            } else if (el.position !== item.position) {
              afterGreens++;
            }
          }
        }
        return {
          isCache,
          filename,
          info: e.info,
          ...(showOriginalInfo && { originalInfo: e.originalInfo }),
          item,
          payload: {
            afterGreens,
            beforeGreens,
            totalItems: e.list.length,
          },
        };
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
