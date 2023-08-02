import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import * as chokidar from 'chokidar';
import * as Fs from 'fs-extra';
import * as Path from 'path';
import * as xEnv from '@my-environment';

import * as cheerioParser from './cheerio.parser';
import { PrKomBaseProvider } from './prkom-base.provider';

@Injectable()
export class PrKomFsProvider extends PrKomBaseProvider {
  protected timeListOfIncoming = 0;

  protected async loadListOfIncoming() {
    const filePath = `${xEnv.PRKOM_SVOD_PATH}/listab1.htm`;
    if (Date.now() - this.timeListOfIncoming < 1e3) {
      return;
    }
    this.timeListOfIncoming = Date.now();

    try {
      const stat = await Fs.stat(filePath);
      this.logger.log(`Stat [listab1.htm]: ${stat.size}; ${stat.mtime}`);
    } catch (err) {
      this.logger.error(err);
      return false;
    }

    try {
      const listab1 = await Fs.readFile(filePath, 'utf-8');

      this.incomingsList = cheerioParser.parseMainIncomingsList(listab1);
      // this.loadedFiles = 0;
      return true;
    } catch (err) {
      this.logger.error(err);
    }
    return false;
  }

  public async getIncomingsInfo(filename: string, useDefaultSvod = false) {
    const filePath = `${
      useDefaultSvod ? xEnv.PRKOM_SVOD_PATH : xEnv.PRKOM_SVOD_PATH_2
    }/${filename}`;

    try {
      const stat = await Fs.stat(filePath);
      this.logger.log(`Stat [${filename}]: ${stat.size}; ${stat.mtime}`);
    } catch (err) {
      if (!useDefaultSvod) {
        return this.getIncomingsInfo(filename, true);
      }
      if (err.code !== 'ENOENT') {
        this.logger.error(err);
      }
      return null;
    }

    try {
      const data = await Fs.readFile(filePath, 'utf-8');

      const response = await cheerioParser.parseIncomingsInfo(data);
      return response || null;
    } catch (err) {
      // this.logger.error('parseIncomingsInfo', err, filename);
      if (err instanceof Error) {
        this.logger.error(err, err.stack, 'parseIncomingsInfo');
      }
      return null;
    }
  }

  public async onFilesWatchLoop() {
    const useSysWatch = xEnv.USE_SYS_FW_WATCHER;

    const onFileEvent = async (path: string, stats?: Fs.Stats) => {
      if (
        !this.filesWatcherPower ||
        stats?.size === 0 ||
        !/\.html?$/.test(path)
      ) {
        return;
      }

      const filename = Path.basename(path);
      if (filename === 'listab1.htm') {
        this.loadListOfIncoming().then();
        return;
      }

      const response = await this.getIncomingsInfo(filename);
      if (!response) {
        return;
      }
      this.logger.log(`[onFileEvent] Auto update file: ${filename}`);
      this.allIncomingsInfo.set(filename, { isCache: false, response });
      this.loadedFiles = this.allIncomingsInfo.size;
    };

    let watcher: chokidar.FSWatcher | undefined;
    if (useSysWatch) {
      watcher = chokidar
        .watch(`${xEnv.PRKOM_SVOD_PATH}/`, {
          depth: 1,
          usePolling: false,
        })
        .on('change', onFileEvent)
        .on('add', onFileEvent);
    }

    do {
      if (!this.filesWatcherPower) {
        break;
      }

      if (useSysWatch !== true) {
        this.logger.debug('[onFilesWatch] execute loop');
        await this.loadListOfIncoming();

        let counter = 0;
        for (const filename of this.incomingsFileNames) {
          ++counter;
          const response = await this.getIncomingsInfo(filename);
          if (!response) continue;
          this.allIncomingsInfo.set(filename, { isCache: false, response });
          this.loadedFiles = this.allIncomingsInfo.size;
          // this.logger.log(`[onFilesWatch] Update file: ${filename}`);
          this.logger.log(
            `[onFilesWatch] Progress: ${counter}/${this.incomingsFileNames.length} => ${this.allIncomingsInfo.size}`,
          );
        }

        if (this.filesWatcherPower) {
          this.logger.log(
            `[onFilesWatch] All done. Waiting for next update...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 4 * 60 * 1e3));
        }
      }
      await new Promise((resolve) => setImmediate(resolve));
    } while (this.filesWatcherPower);

    watcher?.unwatch(`${xEnv.PRKOM_SVOD_PATH}/`);
  }
}
