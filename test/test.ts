import { suite, Test } from '../src';
import { delay } from '../src/util';
import { expect } from 'chai';

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

export async function runSanityTests() {
        
    try {
        await test();
    } catch (e) {
        console.error('Sanity tests failed.');
        console.error(e);
        throw e;
    }
}

async function runTests() {
    suite(describe => {
        describe('Test', it => {
            it('should execute the test function', async () => {
                let success = false;
                let test = new Test('test', () => {
                    success = true;
                });

                await test.run(null, "This Test!");
                expect(success).to.eq(true);
            });
            it('should execute within a TestZone', async () => {
                let success = false;
                let zone = Zone.current;
                let test = new Test('test', () => {
                    if (Zone.current != zone)
                        success = true;
                });

                await test.run(null, "This Test!");
                expect(success).to.eq(true);
            });
            it('should detect an exception and return a failure result', async () => {
                let success = false;
                let test = new Test('test', () => {
                    throw new Error('this!');
                });

                let result = await test.run(null, "This Test!");

                expect(result.passed).to.eq(false);
            });
            it('should detect an async exception and return a failure result', async () => {
                let success = false;
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw new Error('this!');
                    }, 10);
                });

                let result = await test.run(null, "This Test!");

                expect(result.passed).to.eq(false);
            });
            it('should not fail a test for an unrelated child context exception', async () => {
                let success = false;
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw new Error('this!');
                    }, 10);
                });

                await test.run(null, "This Test!");
            });
        });
    });
}

export async function main() {
    try {
        console.log('Running sanity tests...');
        await runSanityTests();
        console.log('Running test suite...');
        await runTests();
    } catch (e) {
        console.error(e);
    }
}

main();