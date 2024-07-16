import { Logger } from '@nestjs/common';
import * as _ from 'lodash';

import { IncomingsLink, AbiturientCachedInfo } from '@my-interfaces';

export abstract class PrKomBaseProvider {
  protected readonly logger = new Logger(this.constructor.name);

  // public incomingsList: IncomingsLink[] = [];
  public loadedFiles: number = -1;

  public filesWatcherPower = false;
  public allIncomingsInfo = new Map<string, AbiturientCachedInfo>();

  public async init() {
    return await this.loadListPdfs();
  }

  // public get incomingsFilesWithInfo() {
  //   return this.incomingsList.flatMap((e) =>
  //     e.specialties.filter(Boolean).flatMap((e) => e.files),
  //   );
  // }

  // public get incomingsFileNames() {
  //   return this.incomingsFilesWithInfo.map((e) => e.filename);
  // }

  protected abstract loadListPdfs(): Promise<boolean>;

  public async processFilesWatcher() {
    if (this.filesWatcherPower) {
      return false;
    }

    this.filesWatcherPower = true;
    this.logger.log('[processFilesWatcher] Run');

    await this.onFilesWatchLoop();

    this.logger.warn('[processFilesWatcher] Stoped');
  }

  protected abstract onFilesWatchLoop(): Promise<void>;
}
