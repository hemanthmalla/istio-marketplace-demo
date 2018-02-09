FROM node:6.12.0

RUN mkdir -p /usr/src/istiodemo/
WORKDIR /usr/src/istiodemo/

COPY ./ /usr/src/istiodemo/

RUN npm install
RUN apt-get update && apt-get install vim -y

EXPOSE 3000

CMD node app.js