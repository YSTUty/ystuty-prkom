import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import * as xEnv from '@my-environment';

import { PrKomService } from './prkom.service';

@Controller('/admission')
export class PrKomController {
  constructor(private readonly prKomService: PrKomService) {}

  @Get('fulllist')
  async getFullList(
    @Query('original', new DefaultValuePipe(false)) original: boolean,
  ) {
    return await this.prKomService.getList(original);
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
