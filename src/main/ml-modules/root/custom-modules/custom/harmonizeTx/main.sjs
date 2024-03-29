const DataHub = require("/data-hub/5/datahub.sjs");
const datahub = new DataHub();

function main(content, options) {
  //grab the doc id/uri for each document in the staging database in the selected collection
  let id = content.uri;

  //here we can grab and manipulate the context metadata attached to the document
  let context = content.context;

  //let's set our output format, so we know what we're exporting; set to JSON in our case
  let outputFormat = options.outputFormat
    ? options.outputFormat.toLowerCase()
    : datahub.flow.consts.DEFAULT_FORMAT;

  //here we check to make sure we're not trying to push out a binary or text document, just xml or json
  if (
    outputFormat !== datahub.flow.consts.JSON &&
    outputFormat !== datahub.flow.consts.XML
  ) {
    datahub.debug.log({
      message:
        "The output format of type " +
        outputFormat +
        " is invalid. Valid options are " +
        datahub.flow.consts.XML +
        " or " +
        datahub.flow.consts.JSON +
        ".",
      type: "error"
    });
    throw Error(
      "The output format of type " +
        outputFormat +
        " is invalid. Valid options are " +
        datahub.flow.consts.XML +
        " or " +
        datahub.flow.consts.JSON +
        "."
    );
  }

  /*
  This scaffolding assumes we obtained the document from the database. If you are inserting information, you will
  have to map data from the content.value appropriately and create an instance (object), headers (object), and triples
  (array) instead of using the flowUtils functions to grab them from a document that was pulled from MarkLogic.
  Also you do not have to check if the document exists as in the code below.

  Example code for using data that was sent to MarkLogic server for the document
  let instance = content.value;
  let triples = [];
  let headers = {};
   */

  //Here we check to make sure the source doc is still there before operating on it
  if (!fn.docAvailable(id)) {
    datahub.debug.log({
      message: "The document with the uri: " + id + " could not be found.",
      type: "error"
    });
    throw Error("The document with the uri: " + id + " could not be found.");
  }

  //grab the 'doc' from the content value space
  let doc = content.value;

  // let's just grab the root of the document if its a Document and not a type of Node (ObjectNode or XMLNode)
  if (doc && (doc instanceof Document || doc instanceof XMLDocument)) {
    doc = fn.head(doc.root);
  }

  //get our instance, default shape of envelope is envelope/instance, else it'll return an empty object/array
  let instance = datahub.flow.flowUtils.getInstance(doc) || {};

  // convert instance to a mutable JSON obj;
  instance = instance.toObject();

  // get triples, return null if empty or cannot be found
  let triples = datahub.flow.flowUtils.getTriples(doc) || [];

  //gets headers, return null if cannot be found
  let headers = datahub.flow.flowUtils.getHeaders(doc) || {};

  // check if we've processed anything with this transaction before
  let targetUri = `/proxy-tx/${instance.txId}.json`;
  const variable = { targetUri: targetUri };

  console.log("targetUri" + targetUri);
  console.log("instance: " + instance);

  const targetDoc = xdmp.eval("cts.doc(targetUri)", variable, {
    database: xdmp.database("data-hub-FINAL")
  });

  let targetInstance = {};
  if (targetDoc != null) {
    targetInstance = fn.head(targetDoc).toObject().envelope.instance;
  }

  const replaceObject = (targetInstance, instance) => {
    targetInstance[instance.category] = instance.payload;
    return targetInstance;
  };

  const appendObject = (targetInstance, instance) => {
    let ar = targetInstance[instance.category] || [];
    if (Array.isArray(instance.payload)) {
      ar.push(...instance.payload);
    } else {
      ar.push(instance.payload);
    }
    targetInstance[instance.category] = ar;
    return targetInstance;
  };

  // Look at the category of data, then decide whether we are going to replace or append
  switch (instance.category) {
    case "metadata":
    case "request":
    case "response":
      targetInstance = replaceObject(targetInstance, instance);
      break;
    case "validationError":
      targetInstance = appendObject(targetInstance, instance);
      break;
    default:
  }

  //If you want to set attachments, uncomment here
  // instance['$attachments'] = doc;

  //insert code to manipulate the instance, triples, headers, uri, context metadata, etc.

  //form our envelope here now, specifying our output format
  let envelope = datahub.flow.flowUtils.makeEnvelope(
    targetInstance,
    headers,
    triples,
    outputFormat
  );

  //assign our envelope value
  content.value = envelope;

  //assign the uri we want, in this case the same
  content.uri = targetUri;

  //assign the context we want
  content.context = context;

  //now let's return out our content to be written
  return content;
}

module.exports = {
  main: main
};
