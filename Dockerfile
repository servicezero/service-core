FROM node:14

# Define build arguments
ARG nexusReg
ARG nexusUser
ARG nexusPass
ARG nexusEmail
ARG buildVersion
RUN test -n "$nexusReg"
RUN test -n "$nexusUser"
RUN test -n "$nexusPass"
RUN test -n "$nexusEmail"
RUN test -n "$buildVersion"

ENV NEXUS_REG=$nexusReg
ENV NEXUS_USER=$nexusUser
ENV NEXUS_PASS=$nexusPass
ENV NEXUS_EMAIL=$nexusEmail
ENV BUILD_VERSION=$buildVersion
ENV PACKAGES_DIR=/opt/build/build/.bundles

# Update software
#RUN apk add --update-cache python make g++
RUN apt install python make g++

# create work dir
RUN mkdir -p /opt/build
WORKDIR /opt/build

# copy sources
COPY . .

# Install dependencies
RUN npm ci
# Build for testing
RUN npm run build:cjs
RUN npm run build:esm
RUN npm run test
# Clean and then release
RUN rm -rf build
RUN npm run build:cjs:release
RUN npm run build:esm:release
RUN npm run bundle:packages
# Publish
RUN chmod +x ./pipeline/publish.sh
RUN ./pipeline/publish.sh
