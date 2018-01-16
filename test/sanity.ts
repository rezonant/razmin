import { suite } from '../src';
import { delay } from '../src/util';

export async function test() {

    let tests = [
        async () => {
            let results = await suite(describe => {
                describe('thing under test', it => {
                    it('will succeed', async () => await delay(1000));
                    it('will succeed', () => { });
                });
            }, {
                reporters: []
            });

            if (!results)
                throw new Error('Received invalid results from suite()');

            if (!results.passed)
                throw new Error(`Should recognize noop success`);
        },
        async () => {
            let results = await suite(describe => {
                describe('thing under test', it => {
                    it('will succeed', () => { });
                    it('will fail', () => { throw new Error('This is an error'); })
                    it('will also succeed', () => { });
                });
            }, {
                reporters: []
            });

            if (!results)
                throw new Error('Received invalid results from suite()');

            if (results.passed)
                throw new Error(`Should not accept a suite that throws exceptions`);
        }
    ];

    await Promise.all(tests.map(x => x()));
}

export async function run() {
        
    try {
        await test();
    } catch (e) {
        console.error('Sanity tests failed.');
        console.error(e);
        process.exit(1);
    }
}

run();