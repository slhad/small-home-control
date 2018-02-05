FROM node:6-alpine
COPY . /nodejs/
WORKDIR /nodejs
RUN npm --silent install
RUN node -v
RUN npm -v
RUN ./node_modules/typescript/bin/tsc -v
RUN ./node_modules/typescript/bin/tsc
RUN npm test
ENTRYPOINT [ "node", "index.js" ]