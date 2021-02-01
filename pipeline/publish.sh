#!/bin/bash

check_vars(){
    var_names=("$@")
    for var_name in "${var_names[@]}"; do
        [ -z "${!var_name}" ] && echo "$var_name is required environment variable." && var_unset=true
    done
    [ -n "$var_unset" ] && exit 1
    return 0
}
check_vars NEXUS_REG NEXUS_USER NEXUS_PASS NEXUS_EMAIL BUILD_VERSION PACKAGES_DIR

# Generate base64 encoded auth token
AUTH=$(echo "${NEXUS_USER}:${NEXUS_PASS}" | base64)

# Save .npmrc for publishing
npmrcFile="$PACKAGES_DIR/.npmrc"
rm -f "$npmrcFile"
cat <<EOF >> "$npmrcFile"
registry=$NEXUS_REG
@service-core:registry=$NEXUS_REG
_auth=$AUTH
email=$NEXUS_EMAIL
always-auth=true
EOF

dir=`realpath "$PACKAGES_DIR"`
for file in $dir/* ; do
  if [[ -d "$file" ]]; then
    pkgName=`basename $file`
    cp "$npmrcFile" "$file/.npmrc"
    echo "Publishing package $pkgName"
    cd "$file"
    npm publish --registry "$NEXUS_REG"
    if [ $? -ne 0 ]; then
        echo "Failed to publish package $pkgName"
        exit 1
    fi
  fi;
done
