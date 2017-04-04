import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { groupBy } from 'Utils';

export interface SelectItem {
    id: string;
    name: string;
    group?: string;
}

export interface SelectProps {
    items: SelectItem[];
    selectedItemId?: string;
    onChanged: (selectedItemId: string) => void;
    required?: boolean;
    className?: string;
    readOnly?: boolean;
    disabled?: boolean;
}

export class Select extends React.PureComponent<SelectProps, void>{
    render() {
        const { items, selectedItemId, onChanged, required, ...props } = this.props;
        const groups = groupBy(items, o => o.group);

        const options: JSX.Element[] = [];
        if (!required || selectedItemId === '') {
            options.push(<option key="empty" value="" disabled={required}>[prázdný výběr]</option>)
        }

        groups.forEach((a, k) => {
            const opts = a.map((o, i) => <option key={i} value={o.id}>{o.name}</option>)
            if (typeof k === 'undefined' || k === '') {
                opts.forEach(o => options.push(o));
            } else {
                options.push(<optgroup key={k} label={k}>{opts}</optgroup>)
            }
        });

        return (
            <select {...props} value={selectedItemId} onChange={e => onChanged(e.currentTarget.value)}>
                {options}
            </select>
        );
    }
}