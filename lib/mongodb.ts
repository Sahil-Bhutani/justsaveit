import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://SahilBhutani:%40bhutaniji21@sahilportfolio.ja7dg.mongodb.net/q2w?retryWrites=true&w=majority";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;
