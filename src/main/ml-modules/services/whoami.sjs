function get(context, params) {
  return { user: xdmp.getCurrentUser() };
}

exports.GET = get;
