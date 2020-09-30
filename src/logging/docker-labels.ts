function flattenDockerMapLabels(mapstr: string){
  const kvs = mapstr.substring(4, mapstr.length - 1) + " "
  const pairs = []
  const regex = /([a-z0-9_-]+):([^:]+)\s/gi
  let m: any
  while((m = regex.exec(kvs))){
    pairs.push([ m[1], m[2] ])
  }
  return pairs
}

/**
 * Find all docker labels, these are environment variables starting with LOG_LABEL_
 * @param labels process.env variables
 * @param prefix Label prefix to add before each label, defaults to "container_"
 * @param envPrefix The prefix on env vars to lookup, defaults to "LOG_LABEL_"
 */
export function getDockerLabels(labels = process.env, prefix = "container_", envPrefix = "LOG_LABEL_"){
  return Object.fromEntries(Object.entries(labels)
    .filter(([ k ]) => k.startsWith(envPrefix))
    .map(([ k, v ]) => [ k.replace(envPrefix, prefix).toLowerCase(), v! ])
    .flatMap(([ k, v ]) => {
      // is docker map with k/v pairs
      return v.startsWith("map[")
        ? flattenDockerMapLabels(v)
          .map(([ k2, v2 ]) => [ (k + "_" + k2).replace(/[^a-z0-9_]+/gi, "_"), v2 ])
        : [ [ k, v ] ]
    }))
}
