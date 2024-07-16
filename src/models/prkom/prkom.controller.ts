import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as xEnv from '@my-environment';
import { convertToNumeric } from '@my-common';

import { PrKomService } from './prkom.service';

@ApiTags('ystu')
@Controller('/admission')
export class PrKomController {
  constructor(private readonly prKomService: PrKomService) {}

  // @Get('all_full_list')
  // async getAllIncomingsInfoList(
  //   @Query('original', new DefaultValuePipe(false)) original?: boolean,
  // ) {
  //   return await this.prKomService.getAllIncomingsInfoList(original);
  // }

  @Get('full_list')
  async getIncomingsInfoListByFile(
    @Query('filename') filename: string,
    @Query('specHash') specHash?: string,
    @Query('original', new DefaultValuePipe(false)) original?: boolean,
  ) {
    const response = await this.prKomService.getIncomingsInfoListByFile(
      filename,
      specHash,
      original,
    );
    if (!response) {
      throw new NotFoundException('Incomings info file not found');
    }
    return response;
  }

  @Get('incomings_list')
  async getIncomingsList() {
    return await this.prKomService.getIncomingsList();
  }

  @Get('info')
  async getInfo() {
    return await this.prKomService.getInfo();
  }

  @Get('get/:uid')
  async getByUid(
    @Param('uid') uid: string,
    @Query('original', new DefaultValuePipe(false)) original: boolean,
  ) {
    return await this.prKomService.getByUids([uid], original);
  }

  @Get('get_many')
  async getByUids(
    @Query('uids') uidsStr: string,
    @Query('original', new DefaultValuePipe(false)) original: boolean,
  ) {
    const uids = uidsStr.split(',').map(convertToNumeric).filter(Boolean);
    return await this.prKomService.getByUids(uids, original);
  }

  @Get('control/:action')
  async onAction(
    @Param('action') action: string,
    @Query('access_token') accessToken: string,
  ) {
    if (accessToken !== xEnv.SERVER_API_ACCESS_TOKEN) {
      throw new BadRequestException('invalid access token');
    }
    return await this.prKomService.onAction(action);
  }
}
