const moment = require("/js/moment.min.js");

function get(context, params) {
  return { today: `Today is ${moment().format("dddd")}` };
}

exports.GET = get;
