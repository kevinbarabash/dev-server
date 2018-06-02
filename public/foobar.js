// @flow
import foo from './foo';
import bar from './bar';

function add(a: string, b: string): string {
    return a + b;
}

const foobar: string = add(foo, bar);

export {foobar as default};
