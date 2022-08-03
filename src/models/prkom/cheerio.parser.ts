import * as cheerio from 'cheerio';
import * as cheerio_ from 'cheerio_';
import * as chTableParser from 'cheerio-tableparser';
import * as _ from 'lodash';
import {
  MagaAbiturientInfo,
  IncomingsLinkType,
  MagaInfoType,
} from '@my-interfaces';

export const getIncomings = (html: string) => {
  const $ = cheerio.load(html);

  // level training files
  const incomings: IncomingsLinkType[] = [];

  const levelTrainingLabels = $('body > div.listab > label');
  for (const levelLabelEl of levelTrainingLabels) {
    const $levelLabel = $(levelLabelEl);

    const levelId = $levelLabel.attr('for');
    const levelFullName = $levelLabel.text().trim();
    const [levelName, levelType] = levelFullName.split('. ');

    const specialties: IncomingsLinkType['specialties'] = [];
    const levelSpecialtyLabels = $($levelLabel.next().get(0)).find('label');
    for (const specLabelEl of levelSpecialtyLabels) {
      const $specLabel = $(specLabelEl);

      const specialtyId = $specLabel.attr('for');
      const specialtyFullName = $specLabel.text().trim();
      const [specialtyCode, ...restWords] = specialtyFullName.split(' ');
      const specialtyName = restWords.join(' ');

      const specialtyLinks = $($specLabel.next().get(0)).find('a');
      const files: {
        name: string;
        filename: string;
      }[] = [];
      for (const linkEl of specialtyLinks) {
        //
        const $link = $(linkEl);

        const linkName = $link.text().trim();
        const linkHref = $link.attr('href');

        files.push({
          name: linkName,
          filename: linkHref,
        });
      }

      specialties.push({
        id: specialtyId,
        code: specialtyCode,
        name: specialtyName,
        fullName: specialtyFullName,
        files,
      });
    }

    incomings.push({
      id: levelId,
      name: levelName,
      fullName: levelFullName,
      levelType,
      specialties,
    });
  }

  return incomings;
};

export const getMagaInfo = async (html: string) => {
  const $ = cheerio.load(html);
  chTableParser($);

  let tbodyData = (
    $('body > table > tbody') as unknown as cheerio_.Cheerio<any>
  ).parsetable(false, true, true) as string[][];

  // console.log('data', tbodyData);
  tbodyData = tbodyData
    .map((e) => (e.every((e) => !e) ? null : e))
    .filter(Boolean);
  // console.log('tbodyData', tbodyData);

  if (tbodyData.length === 0) return null;

  let [
    ,
    ,
    buildDate,
    prkomDate,
    competitionGroupName,
    formTraining,
    levelTraining,
    directionTraining,
    basisAdmission,
    sourceFunding,
    numbersInfo,
    ,
    ...restTable
  ] = tbodyData[0];

  const magaInfo: MagaInfoType = {
    buildDate,
    prkomDate,
    competitionGroupName,
    formTraining,
    levelTraining,
    directionTraining,
    basisAdmission,
    sourceFunding,
    numbersInfo,
  };

  // ! hardcode or smart get from table
  const offset = 12;

  const listApplicants: MagaAbiturientInfo[] = [];

  tbodyData.map((e) => e.splice(0, offset));

  const formatedList = _.zip(...tbodyData);
  if (formatedList[0][1] !== 'Уникальный код') {
    console.log('failed to parse table #2');
  } else {
    formatedList.splice(0, 1);
  }

  for (const data of formatedList) {
    listApplicants.push({
      position: Number(data[0]),
      uid: data[1],
      totalScore: Number(data[2]),
      score2: Number(data[3]),
      scoreExam: Number(data[4]),
      scoreInterview: Number(data[5]),
      scoreCompetitive: Number(data[6]),
      preemptiveRight: !!data[7],
      consentTransfer: !!data[8],
      original: !!data[9],
      originalToUniversity: !!data[10],
      consentToanotherDirection: !!data[11],
    });
  }

  return {
    info: magaInfo,
    list: listApplicants,
  };
};
