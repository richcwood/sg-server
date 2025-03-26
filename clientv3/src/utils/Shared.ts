import _ from "lodash";

// Sadly it's real pain to auto focus elements in popup windows.  Even Vue.nextTick doesn't work
export const focusElement = function(elementName: string) {
  let tryCount = 0;

  const tryToFocus = function() {
    setTimeout(() => {
      const autoFocusElement = document.getElementById(elementName);

      if (autoFocusElement) {
        autoFocusElement.focus();
      } else if (tryCount++ < 5) {
        tryToFocus();
      }
    }, 10);
  };
  tryToFocus();
};

// try to convert a string in form key1=val1, key2=val2, <<key3>>=sensitive_val etc. to a map
export const stringToMap = (input: string): Record<string, string> => {
  const map = {};

  if (_.isString(input) && input.trim()) {
    const items = input.split(",");

    try {
      items.map((item: string) => {
        const itemSplit = item.split("=");
        if (itemSplit.length === 2 && itemSplit[0].trim() && itemSplit[1].trim()) {
          let key = itemSplit[0].trim();
          const val = itemSplit[1].trim();
          if (key.startsWith("<<") && key.endsWith(">>")) {
            key = key.substring(2, key.length - 2);
            map[key] = {};
            map[key]["value"] = val;
            map[key]["sensitive"] = true;
          } else {
            map[key] = {};
            map[key]["value"] = val;
            map[key]["sensitive"] = false;
          }
        } else {
          throw `Item entry not correct: ${item}`;
        }
      });
    } catch (err) {
      throw `Badly formed map string: ${input}, ${err}`;
    }
  }

  return map;
};

// try to convert a string in form key1=val1, key2=val2 etc. to a map
export const tagsStringToMap = (input: string): Record<string, string> => {
  const map = {};

  if (_.isString(input) && input.trim()) {
    const items = input.split(",");

    try {
      items.map((item: string) => {
        const itemSplit = item.split("=");
        if (itemSplit.length === 2 && itemSplit[0].trim() && itemSplit[1].trim()) {
          map[itemSplit[0].trim()] = itemSplit[1].trim();
        } else {
          throw `Item entry not correct: ${item}`;
        }
      });
    } catch (err) {
      throw `Badly formed map string: ${input}, ${err}`;
    }
  }

  return map;
};

// converts a string map {aa: {'value': 'bb', 'sensitive': false}} into a string of the form "aa=bb,<<dd>>=ff,etc"
// optional breakCount = 3 means add a <br> after every 3rd entry
export const mapToString = (input: {[key: string]: {}}, breakCount?: number): string => {
  console.log("input -> ", input);
  if (!input) {
    return "";
  } else {
    let theString = "";
    const keys = Object.keys(input);

    for (let keyCount = 0; keyCount < keys.length; keyCount++) {
      if (theString) {
        if (breakCount && keyCount % breakCount == 0) {
          theString += "<br>";
        } else {
          theString += ", ";
        }
      }

      let key = keys[keyCount];
      const sensitive = input[key]["sensitive"];
      let val = input[keys[keyCount]]["value"];
      if (sensitive) key = `<<${key}>>`;

      theString += `${key}=${val}`;
    }

    return theString;
  }
};

// converts a simple string map {aa: 'bb'} into a string of the form "aa=bb,etc"
// optional breakCount = 3 means add a <br> after every 3rd entry
export const tagsMapToString = (input: {[key: string]: string}, breakCount?: number): string => {
  if (!input) {
    return "";
  } else {
    let theString = "";
    const keys = Object.keys(input);

    for (let keyCount = 0; keyCount < keys.length; keyCount++) {
      if (theString) {
        if (breakCount && keyCount % breakCount == 0) {
          theString += "<br>";
        } else {
          theString += ", ";
        }
      }

      theString += `${keys[keyCount]}=${input[keys[keyCount]]}`;
    }

    return theString;
  }
};
export const truncateString = (input: string, maxLength: number): string => {
  if (!input) {
    return "";
  } else {
    if (isNaN(maxLength) || maxLength < 4) {
      console.error(`maxLength of ${maxLength} is not legal`);
      maxLength = 20;
    }

    if (input.length > maxLength) {
      input = `${input.substring(0, maxLength - 3)}...`;
    }

    return input;
  }
};
