import Server from './lib/Server';

let server = new Server();

server.listen()
  .then((port: number) => {
    console.log(`> Express is listening on port ${port}`);
  })
  .catch((e: Error) => {
    console.error(e.stack);
  });