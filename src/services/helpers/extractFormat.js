const extractFormat = (mimeType) => {
  if (mimeType) {
    return mimeType.split("/")[1];
  }
  return null;
};

module.exports = extractFormat;
