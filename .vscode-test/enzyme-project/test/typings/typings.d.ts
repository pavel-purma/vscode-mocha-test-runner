declare namespace Chai {    
    interface Assertion {
        equalJsx<P>(str?: React.ReactElement<P>): Assertion;
    }
}

