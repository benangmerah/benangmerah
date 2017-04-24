import * as express from 'express';
import * as next from 'next';
import { resolve } from 'path';
import * as getPort from 'get-port';

export default class Server {
  nextApp: any;
  expressApp: express.Application;
  appPath: string;
  port: number;

  constructor() {
    this.appPath = resolve(`${__dirname}/../app`); // path to next.js project (with the pages dir)

    this.nextApp = next({
      dir: this.appPath,
      dev: process.env.NODE_ENV !== 'production'
    });

    this.expressApp = express();
    this.setRoutes();
  }

  setRoutes(): void {
    const app = this.expressApp;

    const handler = this.nextApp.getRequestHandler();
    const defaultRoute = (req, res) => { handler(req, res) };
    const renderResource = (req, res, id) => { this.nextApp.render(req, res, '/resource', { id }) }

    app.get('/', defaultRoute);
    app.get('/about', defaultRoute);

    app.get('/resource/:id', (req, res) => {
      let id: string = req.params.id;
      renderResource(req, res, id);
      // let the page handle 404 logic
    });

    // benangmerah.net resources
    app.get('*', (req, res) => {
      let id: string = `http://benangmerah.net${req.path}`;
      renderResource(req, res, id);
      // let the page handle 404 logic
    });
  }

  async listen(port?: number) {
    if (!port && process.env.NODE_ENV === 'production') {
      port = 80;
    }
    if (!port) {
      port = process.env.PORT;
    }
    if (!port) {
      port = await getPort(3000);
    }

    this.port = port;

    await this.nextApp.prepare();

    return new Promise((resolve, reject) => {
      this.expressApp.listen(this.port, err => {
        if (err) {
          reject(err);
        }
        else {
          resolve(this.port);
        }
      });
    });
  }
}