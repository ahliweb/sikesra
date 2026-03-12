import { DropZone } from '@puckeditor/core';
import { advancedStyleFields, generateInlineStyles } from '../utils/styleHelpers';

export const ContainerBlockFields = {
    display: {
        type: 'select',
        label: 'Display',
        options: [
            { label: 'Block', value: 'block' },
            { label: 'Flex', value: 'flex' },
            { label: 'Grid', value: 'grid' }
        ]
    },
    flexDirection: {
        type: 'select',
        label: 'Flex Direction',
        options: [
            { label: 'Row', value: 'row' },
            { label: 'Column', value: 'column' }
        ]
    },
    alignItems: {
        type: 'select',
        label: 'Align Items (Cross Axis)',
        options: [
            { label: 'Flex Start', value: 'flex-start' },
            { label: 'Center', value: 'center' },
            { label: 'Flex End', value: 'flex-end' },
            { label: 'Stretch', value: 'stretch' }
        ]
    },
    justifyContent: {
        type: 'select',
        label: 'Justify Content (Main Axis)',
        options: [
            { label: 'Flex Start', value: 'flex-start' },
            { label: 'Center', value: 'center' },
            { label: 'Flex End', value: 'flex-end' },
            { label: 'Space Between', value: 'space-between' },
            { label: 'Space Around', value: 'space-around' }
        ]
    },
    gridTemplateColumns: {
        type: 'text',
        label: 'Grid Columns (e.g. 1fr 1fr)'
    },
    gap: {
        type: 'text',
        label: 'Gap (e.g. 1rem)'
    },
    maxWidth: {
        type: 'text',
        label: 'Max Width (e.g. 1200px or 100%)'
    },
    marginAuto: {
        type: 'radio',
        label: 'Center Container (margin: auto)',
        options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false }
        ]
    },
    ...advancedStyleFields
};

export const ContainerBlock = (props) => {
    const {
        display = 'flex',
        flexDirection = 'column',
        alignItems = 'flex-start',
        justifyContent = 'flex-start',
        gridTemplateColumns,
        gap = '1rem',
        maxWidth = '100%',
        marginAuto = false,
        ...rest
    } = props;

    const baseStyles = {
        display,
        gap,
        maxWidth,
        width: '100%',
    };

    if (display === 'flex') {
        baseStyles.flexDirection = flexDirection;
        baseStyles.alignItems = alignItems;
        baseStyles.justifyContent = justifyContent;
    }

    if (display === 'grid' && gridTemplateColumns) {
        baseStyles.gridTemplateColumns = gridTemplateColumns;
    }

    if (marginAuto) {
        baseStyles.marginRight = 'auto';
        baseStyles.marginLeft = 'auto';
    }

    const advancedStyles = generateInlineStyles(rest);
    const combinedStyles = { ...baseStyles, ...advancedStyles };

    return (
        <div style={combinedStyles} className="awcms-container-block">
            <DropZone zone="content" />
        </div>
    );
};
