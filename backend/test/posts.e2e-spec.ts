
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('PostsController (e2e)', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it('/posts (GET)', () => {
        return request(app.getHttpServer())
            .get('/posts')
            .expect(200)
            .expect((res) => {
                if (!Array.isArray(res.body)) {
                    throw new Error('Response body is not an array');
                }
            });
    });

    afterAll(async () => {
        await app.close();
    });
});
