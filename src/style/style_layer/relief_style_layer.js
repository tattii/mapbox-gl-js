// @flow

const StyleLayer = require('../style_layer');
const properties = require('./relief_style_layer_properties');
const Color = require('../../style-spec/util/color');
const {RGBAImage} = require('../../util/image');

const {
    Transitionable,
    Transitioning,
    PossiblyEvaluated
} = require('../properties');

import type {PaintProps} from './relief_style_layer_properties';

class ReliefStyleLayer extends StyleLayer {
    _transitionablePaint: Transitionable<PaintProps>;
    _transitioningPaint: Transitioning<PaintProps>;
    paint: PossiblyEvaluated<PaintProps>;

    constructor(layer: LayerSpecification) {
        super(layer, properties);
        this._updateColorRamp();
    }

    setPaintProperty(name: string, value: mixed, options: {validate: boolean}) {
        super.setPaintProperty(name, value, options);
        if (name === 'relief-colors') {
            this._updateColorRamp(value);
        }
    }

    _updateColorRamp(colors) {
        if (!colors) return;
        const len = colors.length / 2;
        const color_table = new Uint8Array(4 * len * 2);
        const elevation_table = new Uint32Array(len);

        for (let i = 0; i < len; i++){
            const el = colors[2*i];
            const color = Color.parse(colors[2*i + 1]);

            elevation_table[i] = (el != null) ? el + 65536 : Math.pow(2, 32) - 1; // null as MAX

            color_table[4*i    ] = Math.floor(color.r * 255);
            color_table[4*i + 1] = Math.floor(color.g * 255);
            color_table[4*i + 2] = Math.floor(color.b * 255);
        }
        
        color_table.set(new Uint8Array(elevation_table.buffer), 4 * len);
        this.colorRampImage = new RGBAImage({width: len, height: 2}, color_table);
    }
}

module.exports = ReliefStyleLayer;
