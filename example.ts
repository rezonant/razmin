import { suite } from './src';
import { expect } from 'chai';

suite(describe => {
    describe('a widget', it => {
        it('can do things', () => {
            setTimeout(() => {
                expect(3).to.equal(2);
            }, 3 * 1000);
        });
    });
});