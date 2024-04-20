// const TrackingIDModel = require('../models/TrackingId')

exports.slugify = (string) =>
  string
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

exports.firstLetterinArraytoUppercase = (arr) => {
  const formattedArray = arr.map((el) =>
    el.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    )
  );
  return formattedArray;
};

exports.firstLetterInStringToUppercase = (string) => {
  return string.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

exports.containsCharacter = (string, character) => {
  return string.includes(character);
};

exports.generateRandomCode = (numDigits) => {
  let min = Math.pow(10, numDigits - 1);
  let max = Math.pow(10, numDigits) - 1;

  const randomCode = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomCode.toString().padStart(numDigits, "0");
};

exports.addDaysToCurrentDate = (daysToAdd) => {
  const currentDate = new Date();
  const resultDate = new Date(currentDate);
  resultDate.setDate(currentDate.getDate() + daysToAdd);
  return resultDate;
};

exports.dateStringToReadableDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleString(undefined, options);
};

exports.idGenerator = class idGenerator {
  constructor() {
    this.usedIDs = null;
  }

  async generateTrackingID(TrackingIDModel, orderId) {
    while (true) {
      const trackingID = `GSL${this.generateRandomID()}`;
      const isUsed = await TrackingIDModel.findOne({ tracking_id: trackingID });

      if (!isUsed) {
        await TrackingIDModel.create({
          tracking_id: trackingID,
          order: orderId,
        });
        return trackingID;
      }
      console.log("Tracking ID exists, so generating another...");
    }
  }

  generateRandomID() {
    const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789"; //excluding 0 and O
    let trackingID = "";
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      trackingID += characters.charAt(randomIndex);
    }
    return trackingID;
  }
};
