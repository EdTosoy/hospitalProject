import { spawn, ChildProcess } from 'node:child_process';
import { gzipSync } from 'node:zlib';

// Exercise Nest's actual default Express parser in a separate process, without AppModule or a DB.
describe('HTTP parser availability', () => {
  let server: ChildProcess;
  let base: string;
  beforeAll(async () => {
    server = spawn(
      process.execPath,
      [
        '-e',
        `
      require('reflect-metadata');
      const { NestFactory } = require('@nestjs/core');
      const { Module, Controller, Get, Post, Body } = require('@nestjs/common');
      class Probe {
        health() { return { status: 'ok' }; }
        echo(body) { return body; }
      }
      Controller()(Probe);
      Get('health')(Probe.prototype, 'health', Object.getOwnPropertyDescriptor(Probe.prototype, 'health'));
      Post('echo')(Probe.prototype, 'echo', Object.getOwnPropertyDescriptor(Probe.prototype, 'echo'));
      Body()(Probe.prototype, 'echo', 0);
      class ProbeModule {}
      Module({ controllers: [Probe] })(ProbeModule);
      NestFactory.create(ProbeModule, { logger: false }).then(async app => {
        await app.listen(0, '127.0.0.1');
        process.send({ port: app.getHttpServer().address().port });
      });
    `,
      ],
      { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] },
    );
    base = await new Promise<string>((resolve, reject) => {
      server.once('message', (message: { port: number }) =>
        resolve(`http://127.0.0.1:${message.port}`),
      );
      server.once('exit', (code) =>
        reject(new Error(`Isolated parser process exited: ${code}`)),
      );
      server.once('error', reject);
    });
  });
  afterAll(async () => {
    if (server && server.exitCode === null) {
      const stopped = new Promise<void>((resolve) =>
        server.once('exit', () => resolve()),
      );
      server.kill('SIGTERM');
      await stopped;
    }
  });
  it('accepts valid compressed JSON using the installed parser', async () => {
    const response = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
      body: new Uint8Array(gzipSync(JSON.stringify({ synthetic: true }))),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ synthetic: true });
  });
  it('survives malformed gzip and trailing bytes after a valid compressed frame', async () => {
    for (const body of [
      Buffer.from('invalid gzip'),
      Buffer.concat([
        gzipSync('{"synthetic":true}'),
        Buffer.from([0xff, 0xff, 0xff]),
      ]),
    ]) {
      const response = await fetch(`${base}/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
        },
        body: new Uint8Array(body),
      }).catch(() => null);
      expect([201, 400]).toContain(response?.status);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(server.exitCode).toBeNull();
      expect((await fetch(`${base}/health`)).status).toBe(200);
    }
  });
});
