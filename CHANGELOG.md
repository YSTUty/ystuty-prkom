# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.6](https://github.com/YSTUty/ystuty-prkom/compare/v1.0.5...v1.0.6) (2023-08-03)


### 🧹 Chore

* **env:** add `/prkom_svod` to env  `YSTU_URL` ([346c974](https://github.com/YSTUty/ystuty-prkom/commit/346c974ada9045d0c7fccac5668bb3b22722cffb))


### 🚀 Features

* **prkom:** add `get_many` method to controller ([3db0d07](https://github.com/YSTUty/ystuty-prkom/commit/3db0d07c27a6edae7ddbf3d85c291006a45c6f92))
* **provider:** add parsing for second prkom dir ([f13e114](https://github.com/YSTUty/ystuty-prkom/commit/f13e11414fc9e3380ad1b59c1e974eb6b39f0399))

### [1.0.5](https://github.com/YSTUty/ystuty-prkom/compare/v1.0.4...v1.0.5) (2023-07-30)


### 🚀 Features

* **prkom:** add field `beforeOriginals` to payload on get by uid ([e6042ea](https://github.com/YSTUty/ystuty-prkom/commit/e6042ea6fd9794944a9e4faa232499325c85d361))


### 🧹 Chore

* **parser:** check `val` in `prepareType` ([fbcdc4f](https://github.com/YSTUty/ystuty-prkom/commit/fbcdc4fc9d232f4ff40b59d320751ed0eca4f221))
* **parser:** update `isHightPriority` field ([6e1c29b](https://github.com/YSTUty/ystuty-prkom/commit/6e1c29b5ba14c529c51d56dda3e796f7e0cef922))
* **parser:** update green color selector ([37a1d6e](https://github.com/YSTUty/ystuty-prkom/commit/37a1d6e1f25fe078e192945132fa815a74d9203a))
* **prkom:** add `USE_SYS_FW_WATCHER` env for toggle fs watcher type ([de40184](https://github.com/YSTUty/ystuty-prkom/commit/de40184c56ba0f148c1d221d75601bb75aa1c371))

### [1.0.4](https://github.com/YSTUty/ystuty-prkom/compare/v1.0.3...v1.0.4) (2023-07-19)


### 🐛 Bug Fixes

* **parser:** fix field `scoreExam` value ([6cea2bf](https://github.com/YSTUty/ystuty-prkom/commit/6cea2bfe4903d50bb21dfaa71b0a3a07fa850a30))
* **prkom:** no read empty files in fs provider ([21d0281](https://github.com/YSTUty/ystuty-prkom/commit/21d02819f2a12e3b7ed1c8bb28875ea1ab0819e5))


### 🚀 Features

* **parser:** parsing incomings list tables additional info (counts) ([35e52cb](https://github.com/YSTUty/ystuty-prkom/commit/35e52cb193e781e9be7c2990bb04d2eb128cd30e))
* **prkom:** add local fs provider for `prkom_svod` folder; split to web provider ([334da04](https://github.com/YSTUty/ystuty-prkom/commit/334da04468612a28ae4081426024a2ebbf65b32f))


### 🧹 Chore

* **parser:** update for compatibility ([cb5d85f](https://github.com/YSTUty/ystuty-prkom/commit/cb5d85ff542c6c8c0ffa288402bfbd02da40c85a))
* **prkom:** check incomings info file exists ([8441272](https://github.com/YSTUty/ystuty-prkom/commit/8441272da6715f8e4617d255fc2c8d495808dab1))
* **prkom:** watch only `html` files in fs provider ([e1b9411](https://github.com/YSTUty/ystuty-prkom/commit/e1b9411b7c2b3943009c42b8191ccb310226aa29))

### [1.0.3](https://github.com/YSTUty/ystuty-prkom/compare/v1.0.2...v1.0.3) (2023-07-18)


### 🧹 Chore

* **app:** add `cors` & `compression` ([a631e5c](https://github.com/YSTUty/ystuty-prkom/commit/a631e5cf7b72893cfdd59d67698ba4dd0199cf27))
* **parser:** return `titles` from `parseIncomingsInfo` ([2dff227](https://github.com/YSTUty/ystuty-prkom/commit/2dff2273513fb4fd7dbcc16e78e6b44184450e25))
* **prkom:** add split `full_list` to `all_full_list` as many items & `full_list` by filename ([68a9a51](https://github.com/YSTUty/ystuty-prkom/commit/68a9a51741e9cceb77f87ead8357c417d2b30cc6))

### [1.0.2](https://github.com/YSTUty/ystuty-prkom/compare/v1.0.1...v1.0.2) (2023-07-14)


### 🧹 Chore

* **parser:** add `originalFromEGPU` param to `AbiturientInfo` ([bc24416](https://github.com/YSTUty/ystuty-prkom/commit/bc24416ef45b7f734530f261e25d8bef3633bf33))


### 🚀 Features

* **parser:** improve safe column parsing ([e9fb5ab](https://github.com/YSTUty/ystuty-prkom/commit/e9fb5abfa7ad32bc10bf41f6e5cf2b4973058644))

### [1.0.1](https://github.com/YSTUty/ystuty-prkom/compare/v1.0.0...v1.0.1) (2023-07-12)


### 🚀 Features

* **parser:** add `AbiturientInfo` param `isRed` ([0eafab4](https://github.com/YSTUty/ystuty-prkom/commit/0eafab4a757f4cc4f30af8982e3dd15126c69642))
* **prkom:** add parsing for `Specialty` & `Postgraduate` ([95b201a](https://github.com/YSTUty/ystuty-prkom/commit/95b201a6576c96f57f9994542b292bba7f9ab941))

## [1.0.0](https://github.com/YSTUty/ystuty-prkom/compare/v0.1.0...v1.0.0) (2023-07-10)


### 🐛 Bug Fixes

* **prkom:** update parsing `levelTraining` ([a501e2e](https://github.com/YSTUty/ystuty-prkom/commit/a501e2e9e7f7d958bacd4b65bb4c5b7317ea4173))


### 🚀 Features

* **app:** add `swagger` & version prefix ([fd4c71f](https://github.com/YSTUty/ystuty-prkom/commit/fd4c71fdc5e1db34e9e042266e8309aac7a4bc3c))
* **docker:** optimize cache layers ([2bd6bd6](https://github.com/YSTUty/ystuty-prkom/commit/2bd6bd68c41130babbdcfca853b070becf67247c))
* **prkom:** add parse more files (`Bachelor` & `Magister`) ([2575c31](https://github.com/YSTUty/ystuty-prkom/commit/2575c3161bf8f1dcf0b7529bdd07d8d2bc06f8f4))


### 🧹 Chore

* **deps:** update `typescript` ([c4b3424](https://github.com/YSTUty/ystuty-prkom/commit/c4b3424893e3b3418072ea2707f25659e7b17b1c))
* **env:** move param `/files` part value to `YSTU_URL` env ([8b41ee4](https://github.com/YSTUty/ystuty-prkom/commit/8b41ee45aff0233081c3d94173f620a72e9b6b1b))
* **prkom:** add get method `fake` abitur info ([ac297c5](https://github.com/YSTUty/ystuty-prkom/commit/ac297c5e1f1cca33f8150986bbb4393abc288339))
* **prkom:** update `404` error skip; update `ttl` ([3bd9200](https://github.com/YSTUty/ystuty-prkom/commit/3bd9200684a1ca109cad2be2678a7f448e45b378))

## 0.1.0 (2023-07-07)


### 🧹 Chore

* **provider:** catching errors ([53500b2](https://github.com/YSTUty/ystuty-prkom/commit/53500b20d74ecbd21ea3dccffe6f9d0ae465017e))
* **provider:** changed url to list ([1830508](https://github.com/YSTUty/ystuty-prkom/commit/18305087f8057589eb8e82f88cf4c808bdaeb1de))
* setting project ([df9f210](https://github.com/YSTUty/ystuty-prkom/commit/df9f2102ec39d8bbfbb6bab46a9576177e4c7a3d))


### 🐛 Bug Fixes

* correct stopping `filesWatcherPower` ([b6c6b99](https://github.com/YSTUty/ystuty-prkom/commit/b6c6b99866d56a7d2b7d9ee5ffbfcec85e91fd57))
* **parser:** item param `isGreen` only boolean ([fad8ebb](https://github.com/YSTUty/ystuty-prkom/commit/fad8ebb4a3cfdfb2aac7dbacf056299fb1cc4599))
* **types:** `position` type to number ([5d0410a](https://github.com/YSTUty/ystuty-prkom/commit/5d0410a97c8d7efc92a2ec726273094edb53a882))


### 🚀 Features

* added `filename` to response ([433f4a1](https://github.com/YSTUty/ystuty-prkom/commit/433f4a1635d5fe8727a1db55936c2fc322d4a89c))
* added docker ([df5e680](https://github.com/YSTUty/ystuty-prkom/commit/df5e6807b2ea4bac4b4993e727ffbf49efa19559))
* added http `control` actions ([e095e77](https://github.com/YSTUty/ystuty-prkom/commit/e095e77646894f08e1853b2bf3357fb6f67b6229))
* init project ([551be27](https://github.com/YSTUty/ystuty-prkom/commit/551be27b7a14567f04acca52bc4306c28b3c2007))
* **parser:** added `isGreen` value ([9c8f9d1](https://github.com/YSTUty/ystuty-prkom/commit/9c8f9d1e927bffa8c82151bc07436f9f76fd77a5))
* **prkom:** added `Enrolled` type for abiturient info state ([1d79f13](https://github.com/YSTUty/ystuty-prkom/commit/1d79f13257d66dfffa426ebd3ed7e6eadeca6cbb))
* **prkom:** added abiturient info `state`  param ([bc8f901](https://github.com/YSTUty/ystuty-prkom/commit/bc8f90153c88f24b0f67161c46a56007d830e5a3))
* **prkom:** added additional `payload` params ([4c5c4b9](https://github.com/YSTUty/ystuty-prkom/commit/4c5c4b95d82b7a8dcacfa3503e593fd310a6b2be))
* **prkom:** added parsing full table info ([176f718](https://github.com/YSTUty/ystuty-prkom/commit/176f71873b4a38856bcffeccc18d971700cf1124))
* **prkom:** update to a new admission campaign (`232`) ([ad2d84c](https://github.com/YSTUty/ystuty-prkom/commit/ad2d84c31112a0c9233ce41ab3b0a5151852ad70))
* **project:** added simple `prkom` parsing ([6c7f5dc](https://github.com/YSTUty/ystuty-prkom/commit/6c7f5dc8f31af92a4074e7776bc0de1d137e262d))
