FROM node:13.3.0-alpine3.10
ADD . /app
WORKDIR /app
ENV CLIENT_ENDPOINT=ws://coolq:6700/api SERVER_PORT=8080 REDIS_CACHE=redis://cache/
CMD npm i && npm run start