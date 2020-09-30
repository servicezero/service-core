import { getDockerLabels } from "@service-core/logging/docker-labels"

it("reads docker labels with defaults", () => {
  const envVars = {
    LOG_LABEL_FOOBAR: "cool",
    LOG_LABEL_KEYS:   "map[hi:fun oh:boy]",
    LOG_LABEL_YEP:    "bar",
  }

  expect(getDockerLabels(envVars)).toEqual({
    container_foobar:  "cool",
    container_keys_hi: "fun",
    container_keys_oh: "boy",
    container_yep:     "bar",
  })
})

it("reads docker labels with custom env prefix and label prefix", () => {
  const envVars = {
    LL_FOOBAR: "cool",
    LL_KEYS:   "map[hi:fun oh:boy]",
    LL_YEP:    "bar",
  }

  expect(getDockerLabels(envVars, "cn_", "LL_")).toEqual({
    cn_foobar:  "cool",
    cn_keys_hi: "fun",
    cn_keys_oh: "boy",
    cn_yep:     "bar",
  })
})
