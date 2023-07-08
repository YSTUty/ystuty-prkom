import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as xEnv from '@my-environment';

import { PrKomService } from './prkom.service';

@ApiTags('ystu')
@Controller('/admission')
export class PrKomController {
  constructor(private readonly prKomService: PrKomService) {}

  @Get('full_list')
  async getFullList(
    @Query('original', new DefaultValuePipe(false)) original: boolean,
    @Query('filename') filename: string,
  ) {
    const list = await this.prKomService.getList(original);
    if (filename) {
      return list.filter(
        (e) => e.filename.toLowerCase() === filename.toLowerCase(),
      );
    }
    return list;
  }

  @Get('incomings_list')
  async getIncomingsList() {
    return await this.prKomService.getIncomingsList();
  }

  @Get('files')
  async getFiles() {
    return await this.prKomService.getFiles();
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
    return await this.prKomService.getByUid(uid, original);
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
