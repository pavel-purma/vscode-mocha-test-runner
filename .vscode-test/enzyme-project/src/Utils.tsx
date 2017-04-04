import * as ReactDOM from 'react-dom';

type ClassValue = string | number | ClassDictionary | ClassArray;
interface ClassDictionary { [id: string]: boolean; }
interface ClassArray extends Array<ClassValue> { }

export function classNames(...classes: ClassValue[]): string {
    const list = [];

    for (let i = 0; i < classes.length; i++) {
        const arg = classes[i];
        if (!arg) {
            continue;
        }

        if (typeof arg === 'string' || typeof arg === 'number') {
            list.push(arg);
        } else if (Array.isArray(arg)) {
            list.push(classNames.apply(null, arg));
        } else if (typeof arg === 'object') {
            for (let key in arg) {
                if (arg.hasOwnProperty(key) && arg[key]) {
                    list.push(key);
                }
            }
        }
    }

    return list.join(' ');
}

export function groupBy<T, TKey>(array: T[], selector: { (item: T): TKey }): Map<TKey, T[]> {
    const result = new Map<TKey, T[]>();

    for (let i = 0; i < array.length; ++i) {
        const item = array[i];
        const key = selector(item);
        let list: T[];
        if (result.has(key)) {
            list = result.get(key);
        } else {
            list = [];
            result.set(key, list);
        }

        list.push(item);
    }

    return result;
}

type ClickOutsiteEventHandler = { (e: MouseEvent): void };

export class ClickOutsite {

    private static subscribers = new Map<React.Component<any, any>, ClickOutsiteEventHandler>();

    static subscribe(component: React.Component<any, any>, handler: ClickOutsiteEventHandler) {
        if (!ClickOutsite.subscribers.has(component)) {
            ClickOutsite.subscribers.set(component, handler);
        }

        if (ClickOutsite.subscribers.size === 1) {
            document.body.addEventListener('click', this.onClick);
        }
    }

    static unsubscribe(component: React.Component<any, any>, handler: ClickOutsiteEventHandler) {
        ClickOutsite.subscribers.delete(component);
        if (ClickOutsite.subscribers.size === 0) {
            document.body.removeEventListener('click', this.onClick);
        }
    }

    private static onClick = (e: MouseEvent) => {
        const target = e.target as Element;
        console.log(['click: ', target.tagName, target.id && '#' + target.id, target.className && '.' + target.className.replace(/\s/g, '.')].join(''));

        ClickOutsite.subscribers.forEach((handler: ClickOutsiteEventHandler, component: React.Component<any, any>) => {
            const element = ReactDOM.findDOMNode(component);            
            if (target === document.body.parentElement || (element !== target  && !element.contains(target))) {
                handler(e);
            }
        })
    }
}