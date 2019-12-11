FROM node:13.3.0-alpine3.10
ADD . /app
WORKDIR /app
ENV CLIENT_ENDPOINT=ws://coolq:6700/api
ENV SERVER_PORT=8080
CMD npm i && npm run start