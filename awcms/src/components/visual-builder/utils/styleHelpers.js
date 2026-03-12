import React from 'react';
import { ColorPickerField } from '../fields/ColorPickerField';

export const advancedStyleFields = {
    // Spacing
    marginTop: { type: 'text', label: 'Margin Top' },
    marginRight: { type: 'text', label: 'Margin Right' },
    marginBottom: { type: 'text', label: 'Margin Bottom' },
    marginLeft: { type: 'text', label: 'Margin Left' },
    paddingTop: { type: 'text', label: 'Padding Top' },
    paddingRight: { type: 'text', label: 'Padding Right' },
    paddingBottom: { type: 'text', label: 'Padding Bottom' },
    paddingLeft: { type: 'text', label: 'Padding Left' },

    // Background and Border
    backgroundColor: { type: 'custom', label: 'Background Color', render: ColorPickerField },
    borderRadius: { type: 'text', label: 'Border Radius' },

    // Typography
    textColor: { type: 'custom', label: 'Text Color', render: ColorPickerField },
    textAlign: {
        type: 'select',
        label: 'Text Align',
        options: [
            { label: 'Inherit', value: 'inherit' },
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
            { label: 'Justify', value: 'justify' }
        ]
    }
};

export const generateInlineStyles = (props) => {
    const style = {};

    // Spacing
    if (props.marginTop) style.marginTop = props.marginTop;
    if (props.marginRight) style.marginRight = props.marginRight;
    if (props.marginBottom) style.marginBottom = props.marginBottom;
    if (props.marginLeft) style.marginLeft = props.marginLeft;

    if (props.paddingTop) style.paddingTop = props.paddingTop;
    if (props.paddingRight) style.paddingRight = props.paddingRight;
    if (props.paddingBottom) style.paddingBottom = props.paddingBottom;
    if (props.paddingLeft) style.paddingLeft = props.paddingLeft;

    // Background & Border
    if (props.backgroundColor) style.backgroundColor = props.backgroundColor;
    if (props.borderRadius) style.borderRadius = props.borderRadius;

    // Typography
    if (props.textColor) style.color = props.textColor;
    if (props.textAlign && props.textAlign !== 'inherit') style.textAlign = props.textAlign;

    return style;
};

export const withAdvancedStyles = (Component) => {
    return function AdvancedStyleWrapper(props) {
        // Extract inline styles based on standard props
        const inlineStyles = generateInlineStyles(props);

        // If there are no advanced styles applied, just return the component to keep DOM clean
        if (Object.keys(inlineStyles).length === 0) {
            return React.createElement(Component, props);
        }

        return React.createElement(
            'div',
            { style: inlineStyles, className: "awcms-advanced-style-wrapper w-full" },
            React.createElement(Component, props)
        );
    };
};
