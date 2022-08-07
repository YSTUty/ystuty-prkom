export type IncomingsLinkType = {
  id: string;
  fullName: string;
  /** Уровень подготовки */
  name: string;
  /** Форма обучения */
  levelType: string;

  /** Специальности */
  specialties: {
    id: string;
    /** Код специальности */
    code: string;
    name: string;
    fullName: string;

    files: {
      name: string;
      filename: string;
    }[];
  }[];
};

export enum AbiturientInfoStateType {
  Unknown = 0,
  Submitted = 1,
}

export type MagaAbiturientInfo = {
  isGreen: boolean;
  position: number;
  uid: string;
  totalScore: number;
  scoreSubjects: number;
  scoreExam: number;
  scoreInterview: number;
  scoreCompetitive: number;
  preemptiveRight: boolean;
  consentTransfer: boolean;
  original: boolean;
  originalToUniversity: boolean;
  consentToanotherDirection: boolean;
  state: AbiturientInfoStateType | null;
};

export type MagaInfoType = {
  buildDate: string;
  prkomDate: string;
  competitionGroupName: string;
  formTraining: string;
  levelTraining: string;
  directionTraining: string;
  basisAdmission: string;
  sourceFunding: string;
  numbersInfo: string;
};

export type MagaCachedInfo = {
  isCache: any;
  response: {
    info: MagaInfoType;
    list: MagaAbiturientInfo[];
  };
};
