export * from './test-zone';
export * from './timeout';
export * from './lifecycle-container';

export function descriptionConcat(d1 : string, d2 : string) {    
    if (/^[^A-Za-z0-9].*/.test(d2))
        return `${d1}${d2}`;
    else
        return `${d1} ${d2}`;
}