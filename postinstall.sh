cd server
npm i

cd ../clientv3
npm i

if [ "$NODE_ENV" == "production" ]
then
	npm run build
else
	npm run build --mode $NODE_ENV
fi
