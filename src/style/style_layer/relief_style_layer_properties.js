// This file is generated. Edit build/generate-style-code.js, then run `yarn run codegen`.
// @flow
/* eslint-disable */

const styleSpec = require('../../style-spec/reference/latest');

const {
    Properties,
    DataConstantProperty,
    DataDrivenProperty,
    CrossFadedProperty,
    HeatmapColorProperty
} = require('../properties');

import type Color from '../../style-spec/util/color';


export type PaintProps = {|
    "relief-opacity": DataConstantProperty<number>,
    "relief-colors": DataConstantProperty<Color>,
|};

const paint: Properties<PaintProps> = new Properties({
    "relief-opacity": new DataConstantProperty(styleSpec["paint_relief"]["relief-opacity"]),
    "relief-colors": new DataConstantProperty(styleSpec["paint_relief"]["relief-colors"]),
});

module.exports = { paint };
