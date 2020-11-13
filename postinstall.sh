cd server
npm i

cd ../clientv3
npm i

if [ "$VUE_APP_ENV" == "production" ]
then
	npm run build
else
	npm run build --mode $NODE_ENV
fi
