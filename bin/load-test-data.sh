cp .env.debug .env
export NODE_ENV=debug
node test/dist/sg-server/test/src/utils/LoadAllDBData.js test/data/testdata_1.json
