# txProcessingExample

This is a sample project that shows an example of how transaction data could be handled.

It anticipates having different parts of a transaction coming in as separate json documents but with a similar envelope of:

{
  txId: 1234,
  category: (values of response, request, validationError, or metadata),
  payload: {}
}

It combines the individual files into a single document in the FINAL database.
