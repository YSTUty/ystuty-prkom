export type IncomingsLink = {
  /** @example `BO` */
  id: string;
  /** @example `Магистры. Заочное.` */
  fullName: string;
  /**
   * Уровень подготовки
   *
   * @example `Магистры`
   */
  name: string;
  /**
   * Форма обучения
   *
   * @example `Заочное`
   */
  levelType: string;

  /** Специальности */
  specialties: {
    /** @example `BO-1` */
    id: string;
    /**
     * Исходное название специальности (с кодом)
     *
     * @example `08.04.01 Строительство.`
     */
    fullName: string;
    /**
     * Код специальности
     *
     * @example `08.04.01`
     */
    code: string;
    /**
     * Название
     *
     * @example `Строительство.`
     */
    name: string;

    /** Массив файлов со списками */
    files: {
      /**
       * Название конкурсной группы
       *
       * @example `Строительство_ЗФО_платно`
       */
      name: string;
      /**
       * Название файла
       *
       * @example `232_Stroitelstvo_ZFO_platno_PO.html`
       */
      filename: string;
      /**
       * Количество мест
       *
       * @example 15
       */
      countPlaces: number;
      /**
       * Количество заявлений
       *
       * @example 8
       */
      countApplications: number;
      /**
       * Количество зачислений
       *
       * @example 0
       */
      countEnrolled: number;
    }[];
  }[];
};

/** Тип состояния заявления */
export enum AbiturientInfoStateType {
  Unknown = 0,
  Submitted = 1,
  Enrolled = 2,
}

/** Тип формы обучения */
export enum FormTrainingType {
  Unknown = 0,
  FullTime = 1,
  Extramural = 2,
  PartTime = 3,
}

/** Тип уровня образования */
export enum LevelTrainingType {
  Unknown = 0,
  /** Бакалавриат */
  Bachelor = 1,
  /** Магистратура */
  Magister = 2,
  /** Аспирантура */
  Postgraduate = 3,
  /** Специалитет */
  Specialty = 4,
}

/** Оригинальная информация на странице списка поступающих */
export type IncomingsPageOriginalInfo = {
  /** @example `Дата формирования - 07.07.2022. Время формирования - 15:00:00.` */
  buildDate: string;
  // /** @example `Приемная кампания- Приемная кампания 222 от 31.03.2022 14:06:34` */
  // prkomDate: string;
  // /** @example `Конкурсная группа - Управление по программированию` */
  // competitionGroupName: string;
  /** @example `Форма обучения - Очная` */
  formTraining: string;
  // /** @example `Уровень подготовки - Магистр` */
  // levelTraining: string;
  // /** @example `УГС/Направление подготовки/специальность - 27.04.04 Управление в технических системах` */
  // directionTraining: string;
  /** @example `Основание поступления - Бюджетная основа` */
  basisAdmission: string;
  // /** @example `Источник финансирования - Федеральный бюджет` */
  // sourceFunding: string;
  /** @example `Категория приема - Основные места в рамках контрольных цифр` */
  admissionCategory: string;
  /** @example `Подразделение - Исторический факультет / Обществознание и социально-политическая работа` */
  division: string;
  /** @example `Всего мест: 9. Зачислено: 0. К зачислению: 9.` */
  numbersInfo: string;
};

/** Информация на странице списка поступающих */
export type IncomingsPageInfo = {
  /** Дата и время формирования */
  buildDate: Date;
  /** Приемная кампания */
  // prkom: {
  //   /** Номер приемной кампании */
  //   number: number;
  //   /** Дата формирования приемной кампании */
  //   date: Date;
  // };
  /** Конкурсная группа */
  competitionGroupName?: string;
  /** Форма обучения */
  formTraining: FormTrainingType;
  /** Особенности приема */
  receptionFeatures: 'separate' | 'common' | 'none';
  // /** Уровень подготовки */
  // levelTraining: number;
  // /** Направление подготовки/специальность */
  // directionTraining: {
  //   /** Код */
  //   code: string;
  //   /** Название */
  //   name: string;
  // };
  /** Основание поступления */
  basisAdmission: string;
  /** Категория приема */
  admissionCategory: string;
  /** Подразделение */
  division: string;
  // /** Источник финансирования */
  // sourceFunding: string;
  /** Места */
  numbersInfo: {
    /** Всего мест */
    total: number;
    /** Зачислено */
    enrolled: number;
    /** К зачислению */
    toenroll: number;
  };
};

export type AbiturientInfo = AbiturientInfo_Bachelor | AbiturientInfo_Magister;
export type AbiturientInfoComb = AbiturientInfo_Bachelor &
  AbiturientInfo_Magister;

export type AbiturientInfo_Base = {
  /** Выделен зеленым */
  isGreen: boolean;
  /** Выделен красным */
  isRed: boolean;
  /** Номер позиции в списке */
  position: number;
  /** Уникальный код */
  uid: string;
  /** Сумма баллов */
  totalScore: number;
  /** Сумма баллов по предметам */
  scoreSubjectsSum: number;
  /** Сумма баллов за инд. дост. (конкурсные) */
  scoreCompetitive: number;
  /** Преимущ. право */
  preemptiveRight: boolean;
  /** Оригинал в ВУЗе */
  originalInUniversity: boolean;
  /** Оригинал из ЕПГУ */
  originalFromEGPU: boolean;
  /** Состояние */
  state: AbiturientInfoStateType | null;
  /** Приоритет */
  priority: number;
  /** Это высший приоритет */
  isHightPriority: boolean;
  /** Вид документа */
  docType: 'copy' | 'original' | null;
  /** Особенности приема */
  receptionFeatures: 'separate' | 'common' | 'none';
  // receptionFeatures: string | 'Отдельная квота' | 'Общие места';
};

/** Информация заявления (на бакалавриат и специалитет) */
export type AbiturientInfo_Bachelor = AbiturientInfo_Base & {
  /** Баллы по предметам (балл и название предмета) */
  scoreSubjects: [number, string][];
};

/** Информация заявления (на магистратуру и аспирантуру) */
export type AbiturientInfo_Magister = AbiturientInfo_Base & {
  /** Вступительное испытание */
  scoreExam: number;
};

export type SpecRecInfo = {
  info: IncomingsPageInfo;
  originalInfo: IncomingsPageOriginalInfo;
  list: AbiturientInfo[];
  titles: string[];
  hash: string;

  /** Мест */
  countPlaces: number;
  /** Заявлений */
  countApplications: number;
  /** Зачислено */
  countEnrolled: number;
};

export type DirInfo = {
  /** @example `104` */
  codeNum: string;
  /** Направление (специальность) */
  directionTraining:
    | string
    | {
        /** @example `44.03.01` */
        code: string;
        /** @example `Педагогическое образование` */
        name: string;
      };
  // directionTraining: string;
  /** @example `Заочная` */
  formTraining: string;
  /** @example `Б` */
  t2: 'Б' | 'ОК' | 'ПО' | 'Ц' /* string */;
  /** @example `Бюджетная основа` */
  basisAdmission: string;
  /** @example `Основные места в рамках контрольных цифр` */
  admissionCategory: string;
  /** @example `` */
  t3?: 'ОП' /* string */;
  /** @example `История` */
  lsns: string;
  /** Конкурсная группа @example `104_44.03.01_З_Б_История` */
  competitionGroupName: string;

  /** Количество мест @example `4` */
  countPlaces: string;
  /** Подано заявлений всего @example `0` */
  countApplications: string;
  /** Количество мест по договорам об оказании платных образовательных услуг @example `0` */
  countApplications_paid: string;
  /** Подано заявлений на бюджетную основу @example `68` */
  countApplications_budgetary: string;
  /** Подано заявлений на целевой прием @example `68` */
  countApplications_targeted: string;
  /** Подано заявлений на полное возмещение затрат @example `0` */
  countApplications_full_compensation: string;
};
