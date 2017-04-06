export class Foo { 
    constructor(bar) { 
        this.bar = bar;
    }
    
    func(baz) { 
        return this.bar + '-' + baz;
    }
}
