require("dotenv").config();

const fs = require("fs");
const request = require("request-promise");
const uuidv4 = require("uuid/v4");
const _ = require("lodash");

const subscriptionKey = process.env.SUBSCRIPTION_KEY;
const endpoint = process.env.ENDPOINT;
const region = process.env.REGION;

const fileName = process.argv[2];

let JSONOg = require(`./${fileName}`);

function translate(lang) {
  let JSONCopy = _.cloneDeep(JSONOg);

  let allTexts = [];
  let oldToNewVal = {};

  function createTexts(json) {
    Object.keys(json).forEach((key) => {
      if (
        key === "labelColor" ||
        key === "lang" ||
        key === "href" ||
        key === "target"
      ) {
        delete json[key];
      }
    });
    Object.values(json).forEach((value) => {
      if (typeof value === "string") {
        allTexts.push({ text: value });
      } else if (typeof value === "object") {
        createTexts(value);
      } else if (Array.isArray(value)) {
        value.forEach((val) => {
          createTexts(val);
        });
      }
    });
  }

  function translateText(texts, i, lang) {
    let options = {
      method: "POST",
      baseUrl: endpoint,
      url: "translate",
      qs: {
        "api-version": "3.0",
        to: [lang],
      },
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      body: texts,
      json: true,
    };

    request(options, function (err, res, body) {
      body.forEach((result, j) => {
        oldToNewVal[allTexts[i + j].text] = result.translations[0].text;
      });
    }).then((res2) => {
      let copy = _.cloneDeep(JSONOg);
      updateOriginalJSON(copy);
      let data = JSON.stringify(copy);
      fs.writeFileSync(`${fileName}.${lang}.json`, data);
    });
  }

  createTexts(JSONCopy);

  for (let i = 0; i < allTexts.length; i += 100) {
    translateText(allTexts.slice(i, i + 100), i, lang);
  }

  function updateOriginalJSON(json) {
    Object.keys(json).forEach((key) => {
      if (
        key !== "labelColor" &&
        key !== "lang" &&
        key !== "href" &&
        key !== "target"
      ) {
        let ogVal = json[key];
        if (typeof ogVal === "string") {
          if (oldToNewVal[ogVal]) {
            json[key] = oldToNewVal[ogVal];
          }
        } else if (typeof ogVal === "object") {
          updateOriginalJSON(ogVal);
        } else if (Array.isArray(ogVal)) {
          ogVal.forEach((val) => {
            updateOriginalJSON(val);
          });
        }
      }
    });
  }
}

["fr", "de", "ja", "ko", "es", "pt"].forEach((lang) => translate(lang));
