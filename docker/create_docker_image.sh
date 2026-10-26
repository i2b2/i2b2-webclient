#!/usr/bin/env bash

# set -Eeuo pipefail

###############################################################################
# Build and optionally publish i2b2-webclient Docker image
#
# Usage:
#   ./create_docker_image.sh <branch-name>
#
# Example:
#   ./create_docker_image.sh master
###############################################################################


# Convert branch names such as:
# release/1.8.2 -> release-1.8.2
WEBCLIENT_TAG=$(echo "${1:-latest}" | tr '/' '-')

WEBCLIENT_REPO="$(pwd)/.."

CONFIG_FILE="${WEBCLIENT_REPO}/i2b2_config_domains.json"
PROXY_FILE="${WEBCLIENT_REPO}/proxy.php"

#for local build
DOCKER_USERNAME="${DOCKER_USERNAME:-localuser}"
DOCKER_REPOSITORY="${DOCKER_REPOSITORY:-i2b2}"
HAS_SECRETS="${HAS_SECRETS:-false}"

IMAGE_TAG="${DOCKER_USERNAME}/${DOCKER_REPOSITORY}:i2b2-webclient_${WEBCLIENT_TAG}"

echo "Repository: ${WEBCLIENT_REPO}"
echo "Image Tag : ${IMAGE_TAG}"

# Validate required files
test -f "${CONFIG_FILE}"
test -f "${PROXY_FILE}"

cd "${WEBCLIENT_REPO}"

###############################################################################
# Update configuration for containerized deployment
###############################################################################

sed -i \
    's/services.i2b2.org/i2b2-core-server:8080/' \
    "${CONFIG_FILE}"

sed -i \
    's#127.0.0.1:8080/#i2b2-core-server:8080/#g' \
    "${PROXY_FILE}"

sed -i \
    's#http://services.i2b2.org#http://i2b2-core-server:8080#g' \
    "${PROXY_FILE}"

###############################################################################
# Build Docker image
###############################################################################

echo "Building Docker image..."

docker build --no-cache -t "${IMAGE_TAG}" -f "${WEBCLIENT_REPO}/docker/Dockerfile" .

# Saving Docker Image for UI Testing in the Testing Job
docker save ${IMAGE_TAG} -o i2b2-webclient.tar

###############################################################################
# Publish image when registry credentials are available
###############################################################################

if [[ "${HAS_SECRETS:-false}" == "true" ]]; then
    echo "Pushing image..."
    docker push "${IMAGE_TAG}"
else
    echo "Docker credentials not available. Skipping push."
fi

echo "Build completed successfully."
