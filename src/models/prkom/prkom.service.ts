import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as _ from 'lodash';
import {
  AbiturientInfo_Magister,
  IncomingsPageOriginalInfo,
  IncomingsPageInfo,
  FormTrainingType,
  LevelTrainingType,
} from '@my-interfaces';

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

  public async getIncomingsList() {
    if (this.prKomProvider.incomingsList.length === 0) {
      throw new BadRequestException('wait for app initialization');
    }

    return this.prKomProvider.incomingsList;
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

    return [...this.prKomProvider.allIncomingsInfo.entries()].map(
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

  public async getByFake(showOriginalInfo = false) {
    let response: {
      item: AbiturientInfo_Magister;
      payload: {
        afterGreens: number;
        beforeGreens: number;
        totalItems: number;
      };
      originalInfo?: IncomingsPageOriginalInfo;
      isCache: any;
      filename: string;
      info: IncomingsPageInfo;
    }[] = [];

    response.push({
      isCache: null,
      filename: '232_Khimicheskaya tekhnologiya_B.html',
      info: {
        buildDate: new Date(),
        prkom: { number: 232, date: new Date('2022-12-22T12:30:40.000Z') },
        competitionGroupName: 'Химическая технология',
        formTraining: FormTrainingType.FullTime,
        levelTraining: LevelTrainingType.Magister,
        directionTraining: {
          code: '18.04.01',
          name: 'Химическая технология',
        },
        basisAdmission: 'Бюджетная основа',
        sourceFunding: 'Федеральный бюджет',
        numbersInfo: { total: 7, enrolled: 0, toenroll: 7 },
      },
      ...(showOriginalInfo && {
        originalInfo: {
          buildDate:
            'Дата формирования - 07.07.2023. Время формирования - xxx.',
          prkomDate: 'Приемная кампания- Приемная кампания 232 от xxx',
          competitionGroupName: 'Конкурсная группа - Химия',
          formTraining: 'Форма обучения - Очная',
          levelTraining: 'Уровень подготовки - Магистратура',
          directionTraining:
            'УГС/Направление подготовки/специальность - 04.04.01 Химия',
          basisAdmission: 'Основание поступления - Бюджетная основа',
          sourceFunding: 'Источник финансирования - Федеральный бюджет',
          numbersInfo: 'Всего мест: 4. Зачислено: 0. К зачислению: 4.',
        },
      }),
      item: {
        isGreen: false,
        position: _.random(1, 3),
        uid: '123-456-789 00',
        totalScore: _.random(10, 11),
        scoreSubjectsSum: 0,
        scoreExam: null,
        scoreCompetitive: _.random(10, 11),
        preemptiveRight: false,
        originalInUniversity: true,
        state: 1,
        priority: 1,
        priorityHight: 0,
      },
      payload: { afterGreens: 0, beforeGreens: 0, totalItems: 12 },
    });

    return response;
  }

  public async getByUid(uid: string, showOriginalInfo = false) {
    if (!this.isLoaded) {
      throw new BadRequestException('wait for app initialization');
    }

    const result = [...this.prKomProvider.allIncomingsInfo.entries()]
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
