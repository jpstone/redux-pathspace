export function prependArray(slice, payload) {
  return [payload, ...slice];
}

export function appendArray(slice, payload) {
  return slice.push(payload);
}

export function mergeObjectPayloadOverride(slice, payload) {
  return { ...slice, ...payload };
}

export function mergeObjectStateOverride(slice, payload) {
  return { ...payload, ...slice };
}

export function on() {
  return true;
}

export function off() {
  return false;
}

export function toggle(slice) {
  return !slice;
}

export function setUndefined() {
  return undefined;
}
