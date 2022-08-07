import * as cheerio from 'cheerio';
import { parseTable } from '@joshuaavalon/cheerio-table-parser';
import * as _ from 'lodash';
import * as css from 'css';
import {
  MagaAbiturientInfo,
  IncomingsLinkType,
  MagaInfoType,
  AbiturientInfoStateType,
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

const findCssRules = (style: string, property: string, value: string) => {
  const { stylesheet } = css.parse(style);
  const rules = stylesheet.rules
    .map(
      (rule: css.Rule) =>
        rule.type === 'rule' &&
        'declarations' in rule &&
        rule.declarations.find(
          (declaration) =>
            'value' in declaration &&
            declaration.property === property &&
            declaration.value === value,
        ) &&
        rule,
    )
    .filter(Boolean);

  return rules;
};

export const getMagaInfo = async (html: string) => {
  const $ = cheerio.load(html);

  if (!$('body > table > tbody').get(0)) {
    return null;
  }

  let greenSelector: string = null;
  for (const el of $('style')) {
    const css = $(el).text();
    const rules = findCssRules(css, 'background-color', '#90ee90');
    if (rules.length > 0) {
      greenSelector = rules[0]?.selectors[0];
      if (greenSelector) {
        greenSelector = greenSelector.split('.').slice(-1)[0];
      }
      break;
    }
  }

  // // to delete extra columns
  // $('body > table > tbody td[colspan=12]').removeAttr('colspan');

  let tbodyData = parseTable($('body > table > tbody').get(0), {
    parser(element) {
      const content = $(element).text().trim();
      const isGreen = greenSelector && $(element).hasClass(greenSelector);
      // const classes = $(element).attr('class');
      return content && /* classes && */ { isGreen, content /* classes */ };
    },
  });

  if (tbodyData.length === 0) return null;

  let [
    ,
    ,
    [{ content: buildDate }],
    [{ content: prkomDate }],
    [{ content: competitionGroupName }],
    [{ content: formTraining }],
    [{ content: levelTraining }],
    [{ content: directionTraining }],
    [{ content: basisAdmission }],
    [{ content: sourceFunding }],
    [{ content: numbersInfo }],
  ] = tbodyData;

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

  // ! hardcode. or smart get from table
  tbodyData.splice(0, 12);

  const [titles] = tbodyData.splice(0, 1);
  if (titles[1].content !== 'Уникальный код') {
    console.warn('Failed to parse table #2');
  }

  const listApplicants: MagaAbiturientInfo[] = [];
  for (const data of tbodyData) {
    listApplicants.push({
      isGreen: data[0].isGreen,
      position: Number(data[0].content),
      uid: data[1].content,
      totalScore: Number(data[2].content) || null,
      scoreSubjects: Number(data[3].content) || null,
      scoreExam: Number(data[4].content) || null,
      scoreInterview: Number(data[5].content) || null,
      scoreCompetitive: Number(data[6].content) || null,
      preemptiveRight: !!data[7].content,
      consentTransfer: !!data[8].content,
      original: !!data[9].content,
      originalToUniversity: !!data[10].content,
      consentToanotherDirection: !!data[11].content,
      state:
        data[12]?.content?.toLocaleLowerCase() === 'Подано'.toLocaleLowerCase()
          ? AbiturientInfoStateType.Submitted
          : AbiturientInfoStateType.Unknown,
    });
  }

  return {
    info: magaInfo,
    list: listApplicants,
  };
};
