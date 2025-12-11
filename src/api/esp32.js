const HOST = "http://192.168.62.57"; // sua lai IP cua ban

export const ESP = {
  stream: `${HOST}:81/stream`,

  state: () => `${HOST}/camera_state`,
  toggleFlash: () => `${HOST}/toggle_flash`,
  setBrightness: (v) => `${HOST}/set_brightness?value=${v}`,
  setSaturation: (v) => `${HOST}/set_saturation?value=${v}`,

  lastEvent: () => `${HOST}/last_event`,

  photoList: () => `${HOST}/photos_list`,
  photo: (seq) => `${HOST}/photo?seq=${seq}`,

  notify: (status, id) => `${HOST}/notify?status=${status}&id=${id}`,
};
