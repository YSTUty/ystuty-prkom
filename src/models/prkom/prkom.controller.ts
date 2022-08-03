import { Controller, Get, Param } from '@nestjs/common';

import { PrKomService } from './prkom.service';

@Controller('/admission')
export class PrKomController {
  constructor(private readonly prKomService: PrKomService) {}

  @Get('fulllist')
  async getFullList() {
    return await this.prKomService.getList();
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
  async getByUid(@Param('uid') uid: string) {
    return await this.prKomService.getByUid(uid);
  }
}
