export const uuidv4 = () =>
  "111-111-1111".replace(/[018]/g, () =>
    (crypto.getRandomValues(new Uint8Array(1))[0] & 15).toString(16)
  );
